// lib/store.ts — Story AI store.
//
// BACKEND SPLIT (changed from pure-localStorage):
//   • AI **settings** (incl. apiKey) stay device-only in localStorage via
//     zustand `persist` (safer for the key — never leaves the device).
//   • **brand / posts / angles** live in Firestore, per signed-in user:
//        users/{uid}            doc, field `brand`
//        users/{uid}/posts      subcollection
//        users/{uid}/angles     subcollection
//     We subscribe with onSnapshot, so local state is a real-time mirror.
//     Actions write to Firestore; the snapshot then updates local state.
//
// PUBLIC API IS UNCHANGED. Pages keep using exactly:
//   useStore, useHydrated, StoreHydrator
//   state:   settings, brand, angles, posts
//   actions: setSettings, setBrand, addAngles, removeAngle,
//            addPost, updatePost, removePost
// Action signatures are identical. Writes are fire-and-forget (same void
// return); local state still updates via the Firestore snapshot. When data
// hasn't loaded yet (signed out, or before first snapshot) the store holds the
// seed defaults — same as before.

'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import type { AISettings, Angle, Brand, Post } from './types';
import { seedAngles, seedBrand, seedPosts } from './seed';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const STORAGE_KEY = 'storyallday';

const defaultSettings: AISettings = {
  provider: 'zai',
  apiKey: '',
  model: 'glm-4.6',
  baseUrl: '',
};

export type StoreState = {
  settings: AISettings;
  brand: Brand;
  angles: Angle[];
  posts: Post[];

  // actions
  setSettings: (settings: Partial<AISettings>) => void;
  setBrand: (brand: Partial<Brand>) => void;

  addAngles: (angles: Angle[]) => void;
  removeAngle: (id: string) => void;

  addPost: (post: Post) => void;
  updatePost: (id: string, patch: Partial<Post>) => void;
  removePost: (id: string) => void;
};

// --- Firestore path helpers --------------------------------------------------

/** Current signed-in uid, or null. Tracked by the auth listener below. */
let currentUid: string | null = null;

function userDocRef(uid: string) {
  return doc(db, 'users', uid);
}
function postsColRef(uid: string) {
  return collection(db, 'users', uid, 'posts');
}
function anglesColRef(uid: string) {
  return collection(db, 'users', uid, 'angles');
}

// Sort helpers keep ordering stable + matching the old seed order
// (newest-first by createdAt, like prepend semantics).
function byCreatedAtDesc<T extends { createdAt: string }>(a: T, b: T): number {
  return b.createdAt.localeCompare(a.createdAt);
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Seed defaults — shown on the server render, before any Firestore
      // snapshot, and while signed out. Replaced by snapshots once a user
      // signs in (see attachUserSync).
      settings: defaultSettings,
      brand: seedBrand,
      angles: seedAngles,
      posts: seedPosts,

      // settings stays local (persisted) — no Firestore.
      setSettings: (settings) =>
        set((s) => ({ settings: { ...s.settings, ...settings } })),

      // brand → users/{uid} doc, field `brand`. Optimistic local merge, then
      // persist to Firestore (snapshot will reconcile).
      setBrand: (brand) => {
        const next = { ...get().brand, ...brand };
        set({ brand: next });
        const uid = currentUid;
        if (uid) {
          void setDoc(userDocRef(uid), { brand: next }, { merge: true });
        }
      },

      // angles → subcollection users/{uid}/angles. Prepend semantics preserved.
      addAngles: (angles) => {
        set((s) => ({ angles: [...angles, ...s.angles] }));
        const uid = currentUid;
        if (uid) {
          for (const a of angles) {
            void setDoc(doc(anglesColRef(uid), a.id), a);
          }
        }
      },

      removeAngle: (id) => {
        set((s) => ({ angles: s.angles.filter((a) => a.id !== id) }));
        const uid = currentUid;
        if (uid) {
          void deleteDoc(doc(anglesColRef(uid), id));
        }
      },

      // posts → subcollection users/{uid}/posts. Prepend (newest first).
      addPost: (post) => {
        set((s) => ({ posts: [post, ...s.posts] }));
        const uid = currentUid;
        if (uid) {
          void setDoc(doc(postsColRef(uid), post.id), post);
        }
      },

      updatePost: (id, patch) => {
        set((s) => ({
          posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }));
        const uid = currentUid;
        if (uid) {
          // updateDoc requires the doc to exist; it will for any seeded/added
          // post. patch is a shallow Partial<Post> — safe for Firestore.
          void updateDoc(doc(postsColRef(uid), id), patch as Record<string, unknown>);
        }
      },

      removePost: (id) => {
        set((s) => ({ posts: s.posts.filter((p) => p.id !== id) }));
        const uid = currentUid;
        if (uid) {
          void deleteDoc(doc(postsColRef(uid), id));
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      version: 2,
      // ONLY settings is persisted to localStorage now. brand/posts/angles
      // come from Firestore (so we never stash app data on disk).
      partialize: (s) => ({
        settings: s.settings,
      }),
    }
  )
);

// --- Hydration plumbing ------------------------------------------------------
//
// `hydrated` now means: settings rehydrated from localStorage AND the data
// layer has resolved its initial state. "Resolved" =
//   • signed OUT → as soon as auth reports no user (we keep seed defaults), or
//   • signed IN  → after the first brand+posts+angles snapshots arrive.
// This keeps the prior contract (pages gate on useHydrated() before reading
// persisted/app state) and prevents flashing seed data over real user data.

let settingsRehydrated = false;
let dataResolved = false;
let hydrated = false;
const hydrationListeners = new Set<() => void>();

function recomputeHydrated() {
  const next = settingsRehydrated && dataResolved;
  if (next === hydrated) return;
  hydrated = next;
  hydrationListeners.forEach((fn) => fn());
}

function subscribeHydration(onChange: () => void): () => void {
  hydrationListeners.add(onChange);
  return () => {
    hydrationListeners.delete(onChange);
  };
}

/**
 * Mount ONCE near the app root (already done in app/layout.tsx). Triggers the
 * localStorage rehydrate for settings, then wires Firestore sync to auth.
 */
export function StoreHydrator() {
  useEffect(() => {
    const result = useStore.persist.rehydrate();
    Promise.resolve(result).finally(() => {
      settingsRehydrated = true;
      recomputeHydrated();
    });

    // Drive Firestore sync from auth state.
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      handleAuthChange(user);
    });
    return () => {
      unsubAuth();
      teardownUserSync();
    };
  }, []);
  return null;
}

/**
 * Returns true once settings have rehydrated AND the data layer has resolved
 * (see note above). Gate UI that reads persisted/app state behind this.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    () => hydrated,
    () => false
  );
}

// --- Auth → Firestore wiring -------------------------------------------------

let unsubBrand: Unsubscribe | null = null;
let unsubPosts: Unsubscribe | null = null;
let unsubAngles: Unsubscribe | null = null;

// Track first-snapshot arrival per collection so dataResolved flips only once
// all three are in for a signed-in user.
let gotBrandSnap = false;
let gotPostsSnap = false;
let gotAnglesSnap = false;

function teardownUserSync() {
  unsubBrand?.();
  unsubPosts?.();
  unsubAngles?.();
  unsubBrand = unsubPosts = unsubAngles = null;
  gotBrandSnap = gotPostsSnap = gotAnglesSnap = false;
}

function maybeMarkDataResolved() {
  if (gotBrandSnap && gotPostsSnap && gotAnglesSnap) {
    dataResolved = true;
    recomputeHydrated();
  }
}

function handleAuthChange(user: User | null) {
  // Tear down any previous user's subscriptions.
  teardownUserSync();
  currentUid = user?.uid ?? null;

  if (!user) {
    // Signed out: reset to seed defaults (settings untouched — persisted).
    currentUid = null;
    useStore.setState({
      brand: seedBrand,
      angles: seedAngles,
      posts: seedPosts,
    });
    // Data layer is "resolved" for the signed-out state.
    dataResolved = true;
    recomputeHydrated();
    return;
  }

  // New sign-in: data not resolved until first snapshots land.
  dataResolved = false;
  recomputeHydrated();

  void seedIfEmpty(user.uid).finally(() => {
    attachUserSync(user.uid);
  });
}

/**
 * On first sign-in with no data, seed Firestore once from lib/seed.ts so the
 * new user starts with the demo brand/posts/angles. Idempotent: if the user
 * doc already exists we skip seeding.
 */
async function seedIfEmpty(uid: string): Promise<void> {
  try {
    const snap = await getDoc(userDocRef(uid));
    if (snap.exists()) return; // already initialized

    // Double-check posts/angles aren't already present (defensive).
    const [postsSnap, anglesSnap] = await Promise.all([
      getDocs(postsColRef(uid)),
      getDocs(anglesColRef(uid)),
    ]);

    const batch = writeBatch(db);
    batch.set(userDocRef(uid), { brand: seedBrand, seededAt: new Date().toISOString() });
    if (postsSnap.empty) {
      for (const p of seedPosts) batch.set(doc(postsColRef(uid), p.id), p);
    }
    if (anglesSnap.empty) {
      for (const a of seedAngles) batch.set(doc(anglesColRef(uid), a.id), a);
    }
    await batch.commit();
  } catch {
    // If seeding fails (offline/rules), snapshots will still attach and show
    // whatever exists; don't block sign-in.
  }
}

function attachUserSync(uid: string) {
  // If the uid changed again mid-flight, bail (a newer handleAuthChange runs).
  if (currentUid !== uid) return;

  unsubBrand = onSnapshot(
    userDocRef(uid),
    (snap) => {
      const data = snap.data() as { brand?: Brand } | undefined;
      useStore.setState({ brand: data?.brand ?? seedBrand });
      gotBrandSnap = true;
      maybeMarkDataResolved();
    },
    () => {
      gotBrandSnap = true;
      maybeMarkDataResolved();
    }
  );

  unsubPosts = onSnapshot(
    postsColRef(uid),
    (snap) => {
      const posts = snap.docs.map((d) => d.data() as Post).sort(byCreatedAtDesc);
      useStore.setState({ posts });
      gotPostsSnap = true;
      maybeMarkDataResolved();
    },
    () => {
      gotPostsSnap = true;
      maybeMarkDataResolved();
    }
  );

  unsubAngles = onSnapshot(
    anglesColRef(uid),
    (snap) => {
      const angles = snap.docs.map((d) => d.data() as Angle).sort(byCreatedAtDesc);
      useStore.setState({ angles });
      gotAnglesSnap = true;
      maybeMarkDataResolved();
    },
    () => {
      gotAnglesSnap = true;
      maybeMarkDataResolved();
    }
  );
}
