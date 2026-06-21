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
  /** Reference image (resized data URL) — the "source of truth" for the look. */
  refImage?: string;
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
 * Build the full "Character Design Sheet" prompt for a character. Paste this
 * INTO ChatGPT / Grok web together with the reference image (those tools accept
 * an image upload) to get a 100%-reference-faithful model sheet. Known Thai
 * details are injected so sections 8–9 use them.
 */
export function buildCharacterSheetPrompt(c: Character): string {
  const known = [
    `ชื่อ: ${c.name || '(ตั้งให้)'}`,
    `เพศ: ${c.gender || '-'}`,
    c.age && `ช่วงวัย: ${c.age}`,
    c.nationality && `สัญชาติ: ${c.nationality}`,
    c.appearance && `รูปร่าง/ใบหน้า/ผม: ${c.appearance}`,
    c.outfit && `การแต่งกาย: ${c.outfit}`,
    c.distinctive && `จุดเด่น: ${c.distinctive}`,
    c.note && `บุคลิก/หมายเหตุ: ${c.note}`,
    `สไตล์ภาพ: ${c.style}`,
  ]
    .filter(Boolean)
    .join('\n');

  return `ข้อมูลตัวละคร (ใช้ประกอบ section ข้อมูล/โลก — ส่วนหน้าตาให้ยึด "รูปอ้างอิง" เป็นหลัก):
${known}

REFERENCE IMAGE IS THE ABSOLUTE SOURCE OF TRUTH.

Analyze the attached reference image and create a COMPLETE PROFESSIONAL CHARACTER DESIGN SHEET.

The character must remain EXACTLY the same character as the reference image.

Maintain:
• Face
• Eyes
• Hair/Fur
• Body proportions
• Clothing
• Colors
• Personality
• Visual identity

No redesign. No style change. No artistic reinterpretation.

STYLE LOCK:
The final output MUST use exactly the same visual style, rendering quality, lighting, texture detail, material realism, camera characteristics, and artistic treatment as the reference image. If the reference image is photorealistic, the character sheet must also be photorealistic.

━━━━━━━━━━━━━━━━━━━━━━
LAYOUT STRUCTURE — ONE COMPLETE CHARACTER DESIGN SHEET containing ALL sections:

1. MAIN CHARACTER TURNAROUND (FULL BODY)
Front · Front 3/4 · Left Side · Right Side · Back 3/4 · Back. Full body visible, consistent proportions/costume/colors, orthographic turnaround quality.

2. FACIAL EXPRESSION SHEET (large face closeups), labels in Thai:
ปกติ · ยิ้ม · หัวเราะ · ดีใจ · สงสัย · งอน · เศร้า · ตกใจ · โกรธ · เขิน · ง่วงนอน

3. POSE SHEET (full-body): ยืน · เดิน · วิ่ง · นั่ง · กระโดด · โบกมือ · เล่นของเล่น · ท่าประจำตัวละคร

4. COSTUME BREAKDOWN (front & back, technical): เสื้อ · กางเกง/กระโปรง · รองเท้า · หมวก · เครื่องประดับ

5. EQUIPMENT & ACCESSORIES (floating, clean bg): กระเป๋า · ของเล่น · อุปกรณ์ประจำตัว · เครื่องประดับ

6. DETAIL CLOSE-UP (macro): ดวงตา · เส้นผม/ขน · ผิว · เนื้อผ้า · งานปัก · กระดุม · ซิป · รองเท้า

7. COLOR PALETTE (clean swatches): สีหลัก · สีรอง · สีเน้น · สีผิว · สีผม · สีตา · สีเสื้อผ้า

8. CHARACTER INFORMATION (ภาษาไทย): ชื่อ · อายุ · ส่วนสูง · น้ำหนัก · บุคลิก · สิ่งที่ชอบ · สิ่งที่ไม่ชอบ

9. WORLD & LORE (ภาษาไทย 2–4 ประโยค): โลกของตัวละคร · บทบาท · วิถีชีวิต · บรรยากาศของเรื่อง

━━━━━━━━━━━━━━━━━━━━━━
TEXT: ภาษาไทยเท่านั้น · อ่านง่าย · สะกดถูก · ชัดเจน · ไม่มีอักษรเพี้ยน

VISUAL: Professional Character Bible / Animation Studio Model Sheet · White Background · Clean organized layout · Balanced · Museum quality.

OUTPUT: Ultra Photorealistic · 8K · Portrait 9:16 · Sharp focus · Production ready · Reference Fidelity 100% · Character Consistency 100% · Full Character Bible Sheet · No cropped elements · No missing sections · Everything visible in one complete page.`;
}

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
