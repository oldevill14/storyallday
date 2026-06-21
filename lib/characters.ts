'use client';

// lib/characters.ts — reusable "ตัวละคร" (characters) for the sales-clip studio.
//
// Characters are creation assets (a consistent person you reuse across clips).
// Stored device-local in localStorage (zustand persist) — independent of the
// Firestore app data. `characterPromptBlock` renders a verbatim English
// description that gets injected into image/video prompts so the SAME character
// looks consistent across every scene/clip.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Character = {
  id: string;
  /** Display name (Thai ok). */
  name: string;
  /** ชาย | หญิง | อื่นๆ */
  gender: string;
  /** e.g. "วัยทำงาน 30 ต้นๆ" */
  age: string;
  /** Build / face / hair — the look. */
  appearance: string;
  /** Wardrobe / outfit. */
  outfit: string;
  /** Visual style, e.g. Photorealistic / 3D Pixar / Anime. */
  style: string;
  /** Distinctive features (scar, glasses, tattoo…). */
  distinctive: string;
  /** สัญชาติ / ethnicity. */
  nationality: string;
  /** Free note. */
  note?: string;
  createdAt: string;
};

export type CharacterStore = {
  items: Character[];
  add: (c: Omit<Character, 'id' | 'createdAt'>) => void;
  update: (id: string, patch: Partial<Character>) => void;
  remove: (id: string) => void;
};

function uid(): string {
  // No Date.now()/random restriction here (app runtime, not a workflow script).
  return `char-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const useCharacters = create<CharacterStore>()(
  persist(
    (set) => ({
      items: [],
      add: (c) =>
        set((s) => ({
          items: [
            { ...c, id: uid(), createdAt: new Date().toISOString() },
            ...s.items,
          ],
        })),
      update: (id, patch) =>
        set((s) => ({
          items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((it) => it.id !== id) })),
    }),
    {
      name: 'storyallday-characters',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/**
 * The verbatim character description injected into image/video prompts. Keeping
 * this identical across scenes is what holds the character's identity steady.
 * SAFETY: always renders as an adult (WorkD safety) and avoids real names.
 */
export function characterPromptBlock(c: Character): string {
  const parts = [
    `adult ${c.gender || 'person'}`,
    c.age && `age ${c.age}`,
    c.nationality && `${c.nationality}`,
    c.appearance,
    c.outfit && `wearing ${c.outfit}`,
    c.distinctive && `distinctive: ${c.distinctive}`,
    c.style && `style: ${c.style}`,
  ].filter(Boolean);
  return parts.join(', ');
}
