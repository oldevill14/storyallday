'use client';

// lib/connections.ts — connectable channels + persisted connection state.
//
// NOTE: connection "channels" are a SUPERSET of post-target `Platform`s. We keep
// them separate so adding TikTok/YouTube/Shopee here doesn't change the post
// schema (Post.platforms stays facebook/instagram/line). State is device-local
// (localStorage) — the guided wizard marks a channel connected; real publishing
// APIs (OAuth + each platform's content API) are wired server-side later.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ChannelId =
  | 'facebook'
  | 'instagram'
  | 'line'
  | 'tiktok'
  | 'youtube'
  | 'shopee';

type ConnectionStore = {
  connected: Record<string, boolean>;
  connect: (id: ChannelId) => void;
  disconnect: (id: ChannelId) => void;
};

export const useConnections = create<ConnectionStore>()(
  persist(
    (set) => ({
      connected: {},
      connect: (id) =>
        set((s) => ({ connected: { ...s.connected, [id]: true } })),
      disconnect: (id) =>
        set((s) => ({ connected: { ...s.connected, [id]: false } })),
    }),
    {
      name: 'storyallday-connections',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
