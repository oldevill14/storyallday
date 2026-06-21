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
import type {
  AISettings,
  Angle,
  Brand,
  Membership,
  Post,
  Provider,
  ProviderConfig,
  Role,
} from './types';
import { ALL_PROVIDERS, DEFAULT_MODEL } from './types';
import { seedAngles, seedBrand, seedPosts } from './seed';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const STORAGE_KEY = 'storyallday';

/** Fresh per-provider config map — every provider with its default model. */
function emptyKeys(): Record<Provider, ProviderConfig> {
  return ALL_PROVIDERS.reduce((acc, p) => {
    acc[p] = { apiKey: '', model: DEFAULT_MODEL[p], baseUrl: '' };
    return acc;
  }, {} as Record<Provider, ProviderConfig>);
}

const defaultSettings: AISettings = {
  provider: 'zai',
  apiKey: '',
  model: 'glm-4.6',
  baseUrl: '',
  keys: emptyKeys(),
};

/** The signed-in account's identity + access fields (from their user doc). */
export type MeState = {
  uid: string;
  email: string;
  role: Role;
  membership: Membership | null;
} | null;

export type StoreState = {
  settings: AISettings;
  brand: Brand;
  angles: Angle[];
  posts: Post[];
  /** Current user's role/membership. null while signed out or pre-snapshot. */
  me: MeState;

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

/** Merge a partial update into `me` (two listeners feed it: users + memberships). */
function updateMe(uid: string, patch: Partial<NonNullable<MeState>>) {
  const cur = useStore.getState().me;
  const base =
    cur && cur.uid === uid
      ? cur
      : { uid, email: auth.currentUser?.email ?? '', role: 'member' as Role, membership: null };
  useStore.setState({ me: { ...base, ...patch } });
}

function userDocRef(uid: string) {
  return doc(db, 'users', uid);
}
function membershipDocRef(uid: string) {
  return doc(db, 'memberships', uid);
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
      me: null,

      // settings stays local (persisted) — no Firestore.
      // Per-provider aware: writes the (post-patch) active config into
      // keys[provider] so switching providers never clobbers another's key.
      setSettings: (patch) =>
        set((s) => {
          const cur = s.settings;
          const keys = cur.keys ?? emptyKeys();
          const provider = patch.provider ?? cur.provider;
          const switching = provider !== cur.provider;
          const saved =
            keys[provider] ?? {
              apiKey: '',
              model: DEFAULT_MODEL[provider],
              baseUrl: '',
            };
          // Baseline = the target provider's saved config when switching,
          // otherwise the current active values.
          const baseApiKey = switching ? saved.apiKey : cur.apiKey;
          const baseModel = switching ? saved.model : cur.model;
          const baseBaseUrl = switching
            ? saved.baseUrl ?? ''
            : cur.baseUrl ?? '';
          const apiKey = patch.apiKey ?? baseApiKey;
          const model = patch.model ?? baseModel;
          const baseUrl = patch.baseUrl ?? baseBaseUrl;
          const nextKeys = {
            ...keys,
            [provider]: { apiKey, model, baseUrl },
          };
          return { settings: { provider, apiKey, model, baseUrl, keys: nextKeys } };
        }),

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
      version: 3,
      // ONLY settings is persisted to localStorage now. brand/posts/angles
      // come from Firestore (so we never stash app data on disk).
      partialize: (s) => ({
        settings: s.settings,
      }),
      // v2 → v3: the old shape had a single apiKey/model/baseUrl. Carry it into
      // keys[activeProvider] so no saved key is ever lost on upgrade.
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as { settings?: Partial<AISettings> };
        const old = (p.settings ?? {}) as Partial<AISettings>;
        const provider = (old.provider as Provider) ?? 'zai';
        const keys = emptyKeys();
        if (version < 3) {
          keys[provider] = {
            apiKey: old.apiKey ?? '',
            model: old.model ?? DEFAULT_MODEL[provider],
            baseUrl: old.baseUrl ?? '',
          };
        } else if (old.keys) {
          Object.assign(keys, old.keys);
        }
        const active = keys[provider];
        return {
          settings: {
            provider,
            apiKey: active.apiKey,
            model: active.model,
            baseUrl: active.baseUrl ?? '',
            keys,
          },
        } as Partial<StoreState>;
      },
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
let unsubMembership: Unsubscribe | null = null;
let unsubPosts: Unsubscribe | null = null;
let unsubAngles: Unsubscribe | null = null;

// Track first-snapshot arrival per collection so dataResolved flips only once
// all of them are in for a signed-in user.
let gotBrandSnap = false;
let gotMembershipSnap = false;
let gotPostsSnap = false;
let gotAnglesSnap = false;

function teardownUserSync() {
  unsubBrand?.();
  unsubMembership?.();
  unsubPosts?.();
  unsubAngles?.();
  unsubBrand = unsubMembership = unsubPosts = unsubAngles = null;
  gotBrandSnap = gotMembershipSnap = gotPostsSnap = gotAnglesSnap = false;
}

function maybeMarkDataResolved() {
  if (gotBrandSnap && gotMembershipSnap && gotPostsSnap && gotAnglesSnap) {
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
      me: null,
    });
    // Data layer is "resolved" for the signed-out state.
    dataResolved = true;
    recomputeHydrated();
    return;
  }

  // New sign-in: data not resolved until first snapshots land. Set a provisional
  // `me` immediately so the access gate knows the email (super-admin check works
  // before the Firestore snapshot fills role/membership).
  useStore.setState({
    me: { uid: user.uid, email: user.email ?? '', role: 'member', membership: null },
  });
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

    const email = auth.currentUser?.email ?? '';
    const now = new Date().toISOString();
    const batch = writeBatch(db);
    // New accounts start with NO membership doc → blocked until an admin
    // activates them (creates memberships/{uid}). role/membership are NEVER
    // written here — they live in the admin-only `memberships` collection. The
    // super-admin is recognized by email, so it needs no seeded role.
    batch.set(userDocRef(uid), {
      brand: seedBrand,
      email,
      createdAt: now,
      seededAt: now,
    });
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

  // users/{uid}: member-owned (brand + email). NO role/membership here.
  unsubBrand = onSnapshot(
    userDocRef(uid),
    (snap) => {
      const data = snap.data() as { brand?: Brand; email?: string } | undefined;
      useStore.setState({ brand: data?.brand ?? seedBrand });
      updateMe(uid, { email: auth.currentUser?.email ?? data?.email ?? '' });
      gotBrandSnap = true;
      maybeMarkDataResolved();
    },
    () => {
      gotBrandSnap = true;
      maybeMarkDataResolved();
    }
  );

  // memberships/{uid}: admin-controlled (role + subscription window). Members
  // can read their own but can NEVER write it (firestore.rules). Drives access.
  unsubMembership = onSnapshot(
    membershipDocRef(uid),
    (snap) => {
      const data = snap.data() as
        | { role?: Role; membership?: Membership }
        | undefined;
      updateMe(uid, {
        role: (data?.role as Role) ?? 'member',
        membership: data?.membership ?? null,
      });
      gotMembershipSnap = true;
      maybeMarkDataResolved();
    },
    () => {
      // Permission/offline error → treat as no membership (blocked), but don't
      // hang hydration.
      updateMe(uid, { role: 'member', membership: null });
      gotMembershipSnap = true;
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
