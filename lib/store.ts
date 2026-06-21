// lib/store.ts — Zustand store with localStorage persistence for Story AI.
//
// HYDRATION (read this if you build a page):
//   zustand `persist` is client-only. On the server (and the first client
//   render) the store holds the *seed* defaults. To avoid a hydration
//   mismatch, gate any UI that reads persisted state behind `useHydrated()`:
//
//     const hydrated = useHydrated();
//     const posts = useStore((s) => s.posts);
//     if (!hydrated) return <Spinner />;  // or render a skeleton
//
//   We use `skipHydration: true` + a manual `rehydrate()` fired once on the
//   client (see `StoreHydrator` below, mounted in app/layout.tsx). Until that
//   runs, `useHydrated()` returns false everywhere.

'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AISettings, Angle, Brand, Post } from './types';
import { seedAngles, seedBrand, seedPosts } from './seed';

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

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // seed defaults — used on first load (empty persisted state) and on the
      // server render before rehydration.
      settings: defaultSettings,
      brand: seedBrand,
      angles: seedAngles,
      posts: seedPosts,

      setSettings: (settings) =>
        set((s) => ({ settings: { ...s.settings, ...settings } })),

      setBrand: (brand) => set((s) => ({ brand: { ...s.brand, ...brand } })),

      addAngles: (angles) => set((s) => ({ angles: [...angles, ...s.angles] })),

      removeAngle: (id) =>
        set((s) => ({ angles: s.angles.filter((a) => a.id !== id) })),

      addPost: (post) => set((s) => ({ posts: [post, ...s.posts] })),

      updatePost: (id, patch) =>
        set((s) => ({
          posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),

      removePost: (id) =>
        set((s) => ({ posts: s.posts.filter((p) => p.id !== id) })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Don't auto-rehydrate during module load — we trigger it on the client
      // via StoreHydrator so SSR and first client render stay consistent.
      skipHydration: true,
      version: 1,
      // Persist data, not the action functions.
      partialize: (s) => ({
        settings: s.settings,
        brand: s.brand,
        angles: s.angles,
        posts: s.posts,
      }),
    }
  )
);

// --- Hydration plumbing ------------------------------------------------------

/** Module-level flag flipped once manual rehydration has run on the client. */
let hydrated = false;
const hydrationListeners = new Set<() => void>();

function markHydrated() {
  if (hydrated) return;
  hydrated = true;
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
 * manual localStorage rehydrate and flips the `useHydrated()` flag.
 */
export function StoreHydrator() {
  useEffect(() => {
    // rehydrate() may return a promise; flip the flag when it settles.
    const result = useStore.persist.rehydrate();
    Promise.resolve(result).finally(markHydrated);
  }, []);
  return null;
}

/**
 * Returns true once the persisted localStorage state has been merged in.
 * Use it to gate UI that reads persisted state (see header comment).
 */
export function useHydrated(): boolean {
  // useSyncExternalStore subscribes to the module-level `hydrated` flag without
  // an effect+setState. The server snapshot is always `false`, matching the
  // first client render (hydration hasn't run yet) — so no hydration mismatch.
  return useSyncExternalStore(
    subscribeHydration,
    () => hydrated, // client snapshot
    () => false // server snapshot
  );
}
