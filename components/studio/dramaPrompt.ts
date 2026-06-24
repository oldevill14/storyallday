// components/studio/dramaPrompt.ts — builds the Thai system+user prompts for the
// WorkD-Cine pipeline and parses the strict-JSON drama the model returns.

import { parseJSON } from '@/lib/ai';
import type {
  Drama,
  Character,
  Episode,
  Scene,
  StudioForm,
  VisualStyle,
} from './types';

/** WorkD safety suffix appended to every image/video prompt. */
export const SAFETY_SUFFIX =
  'All characters are consenting adults. Safe-for-work, brand-safe, non-violent, no minors, professional commercial production.';

/**
 * System prompt — Thai director persona with WorkD safety baked in. The model
 * must return STRICT JSON only.
 */
export function buildSystemPrompt(
  style: VisualStyle,
  aspectRatio: '9:16' | '16:9' = '9:16',
): string {
  const orient = aspectRatio === '16:9' ? 'horizontal/landscape' : 'vertical';
  return `คุณคือผู้กำกับและนักเขียนบท "ละครสั้น" (short drama) มืออาชีพสำหรับสตูดิโอผลิตคอนเทนต์เชิงพาณิชย์ (WorkD-Cine)

หน้าที่ของคุณ: แตกหัวข้อ/แนวคิดที่ได้รับ ออกเป็น "เรื่องเดียวที่ต่อเนื่องกัน" → ตอน → ฉาก พร้อม prompt สำหรับสร้างภาพและวิดีโอแบบ image-to-video

ข้อบังคับด้านความปลอดภัย (WorkD safety — ห้ามฝ่าฝืน):
- ตัวละครทุกตัวต้องเป็น "ผู้ใหญ่" เท่านั้น (adult) — ห้ามมีเด็กหรือผู้เยาว์โดยเด็ดขาด หากบทต้องการตัวละครอายุน้อย ให้ระบุเป็นผู้ใหญ่ (adult) เสมอ
- ห้ามใช้ชื่อดารา ชื่อบุคคลจริง หรือชื่อแบรนด์จริงทุกชนิด ใช้ชื่อสมมติเท่านั้น
- เนื้อหาต้องปลอดภัยเชิงพาณิชย์ ไม่มีความรุนแรง ไม่มีเนื้อหาผู้ใหญ่ ไม่ละเมิดลิขสิทธิ์
- ทุกค่า visualPrompt และ videoPrompt ต้องลงท้ายด้วยประโยคนี้เป๊ะ ๆ (ภาษาอังกฤษ): "${SAFETY_SUFFIX}"

★★ ความต่อเนื่อง (Continuity engine — สำคัญที่สุด) ★★
ภาพ/คลิปแต่ละฉากถูกเจนแยกกัน (stateless) ดังนั้น "ความต่อเนื่อง" ต้องถูกล็อกเป็นข้อมูลกลาง แล้วเรื่องต้องร้อยเป็นเส้นเดียว:
1. "styleBible" — ล็อก "ลุค" รวมของทั้งเรื่องเป็นภาษาอังกฤษหนึ่งย่อหน้า: โทนสี (palette) อารมณ์แสง (lighting mood) เลนส์/มุมมอง โทนฟิล์ม/เกรดสี และโลก/ยุคสมัย — ใช้เหมือนกันทุกฉาก
2. ทุกตัวละครต้องมี "appearance" — อัตลักษณ์ภาพภาษาอังกฤษหนึ่งบรรทัด (ช่วงวัยผู้ใหญ่, ใบหน้า, ทรงผม, รูปร่าง, ชุด/สีประจำตัว) — หน้าตา/ชุดต้อง "เหมือนเดิมเป๊ะทุกฉาก"
3. เรื่องต้องเป็น "เส้นเดียวต่อเนื่อง": ฉากถัดไปต้องสืบเนื่องจากฉากก่อนหน้า (เหตุ→ผล, ไทม์ไลน์เดิน, สถานที่/เวลาเปลี่ยนอย่างมีเหตุผล) ห้ามเป็นฉากกระจัดกระจายไม่เกี่ยวกัน
4. แต่ละ scene ต้องระบุ "characters" (ชื่อตัวละครที่อยู่ในฉากนั้น) และ "continuity" (โน้ตไทย: อะไรต่อเนื่องจากฉากก่อน — เวลา/สถานที่/เสื้อผ้า/พร็อพ/อารมณ์ และกล้องเชื่อมจากช็อตก่อนอย่างไร)

ข้อกำหนดของ prompt (เขียนให้ "โฟกัสเฉพาะฉากนี้" — ระบบจะผนวกบล็อกความต่อเนื่องที่ล็อกไว้ให้อัตโนมัติ จึง "ไม่ต้อง" ลอก styleBible หรือ appearance เต็ม ๆ ซ้ำในทุก prompt แค่อ้างตัวละครด้วย "ชื่อ"):
- visualPrompt: ภาษาอังกฤษ เริ่มด้วยสไตล์ "${style}" แล้วบรรยายเฉพาะ subject/action/กรอบภาพ/แสงของฉากนี้ สำหรับอัตราส่วน ${aspectRatio} (${orient}) อ้างตัวละครด้วยชื่อ จบด้วยประโยคความปลอดภัย
- videoPrompt: ภาษาอังกฤษ เป็นคำสั่ง image-to-video — ขึ้นต้นด้วยการเชื่อมจากช็อตก่อน (เช่น "Continuing from the previous shot, ...") บอกการเคลื่อนกล้อง + การเคลื่อนไหวตัวละคร คงชุด/ลุคเดิม ใส่บทพูดในเครื่องหมายคำพูด ("...") จบด้วยประโยคความปลอดภัย
- dialogue: ภาษาไทย บทพูดของตัวละครในฉากนั้น
- duration: ใช้ "8s"

ตอบกลับเป็น JSON เท่านั้น (ไม่มีคำอธิบาย ไม่มี markdown code fence) ตามโครงสร้างนี้เป๊ะ ๆ:
{
  "title": "ชื่อเรื่อง (ไทย)",
  "logline": "เรื่องย่อ 1-2 ประโยค (ไทย)",
  "styleBible": "Locked global look in English: palette, lighting mood, lens, film grade, world/era — identical for every scene",
  "characters": [{ "name": "ชื่อสมมติ", "description": "คำอธิบายตัวละคร (ผู้ใหญ่, ไทย)", "appearance": "Locked English identity: adult age, face, hair, build, signature outfit/colour" }],
  "episodes": [
    {
      "ep": 1,
      "scenes": [
        {
          "setting": "สถานที่/บรรยากาศฉาก (ไทย)",
          "action": "สิ่งที่เกิดขึ้นในฉาก (ไทย) — สืบเนื่องจากฉากก่อน",
          "dialogue": "บทพูด (ไทย)",
          "characters": ["ชื่อตัวละครที่อยู่ในฉากนี้"],
          "continuity": "โน้ตไทย: อะไรต่อเนื่องจากฉากก่อน + กล้องเชื่อมอย่างไร",
          "visualPrompt": "${style}, <this scene only>, ${SAFETY_SUFFIX}",
          "videoPrompt": "Continuing from the previous shot, Camera ... \\"dialogue here\\" ... , ${SAFETY_SUFFIX}",
          "duration": "8s"
        }
      ]
    }
  ]
}`;
}

/** Optional product + cast context woven into generation and regeneration. */
export type CreativeContext = {
  productName?: string;
  productDetail?: string;
  /** Verbatim English character description blocks (kept identical for consistency). */
  cast?: string[];
  /** Selling style: { label, instruction } from SALES_STYLE_META. */
  salesStyle?: { label: string; instruction: string };
  /** Locked global look (from the generated drama) — keeps regen shots on-style. */
  styleBible?: string;
};

/** Thai context block describing the product + chosen cast, or '' if none. */
function contextBlock(ctx?: CreativeContext): string {
  if (!ctx) return '';
  const lines: string[] = [];
  if (ctx.salesStyle) {
    lines.push(
      `สไตล์การขาย: ${ctx.salesStyle.label} — ${ctx.salesStyle.instruction} (ใช้โทนนี้กับบทพูดและการนำเสนอสินค้าในทุกฉาก)`
    );
  }
  if (ctx.productName?.trim() || ctx.productDetail?.trim()) {
    lines.push(
      `สินค้าที่ต้องขาย/นำเสนอในคลิป: ${ctx.productName?.trim() || '(ระบุในรายละเอียด)'}` +
        (ctx.productDetail?.trim() ? `\nรายละเอียดสินค้า: ${ctx.productDetail.trim()}` : '')
    );
    lines.push(
      'ให้ทุกตอน/ฉากร้อยเรื่องให้ "ขายสินค้านี้" อย่างเป็นธรรมชาติ (รีวิว/ป้ายยา/เล่าเรื่องแล้วปิดการขาย) และให้สินค้าปรากฏเด่นในภาพ'
    );
  }
  if (ctx.cast && ctx.cast.length > 0) {
    lines.push(
      'ตัวละครที่เลือกไว้ (ใช้เป็น "นักแสดง" สวมบทตามหัวข้อ — ผูกตัวละครเหล่านี้เข้ากับโครงเรื่องของหัวข้ออย่างเป็นธรรมชาติ ไม่สร้างตัวละครอื่นเพิ่ม; ชื่อเรื่อง/เนื้อเรื่อง/ทุกฉากต้องสอดคล้องกับทั้งหัวข้อ "และ" ตัวละครเหล่านี้; คัดลอกคำบรรยายลักษณะ "เป๊ะ ๆ" เป็น appearance ของแต่ละตัว):'
    );
    ctx.cast.forEach((c, i) => lines.push(`  ${i + 1}. ${c}`));
  }
  return lines.length ? `\n${lines.join('\n')}\n` : '';
}

/** User prompt — feeds the topic/idea + episode/scene counts (+ product/cast). */
export function buildUserPrompt(form: StudioForm, ctx?: CreativeContext): string {
  const titleLine = form.title.trim()
    ? `ชื่อเรื่อง (ถ้ามีให้ใช้เป็นแนวทาง): ${form.title.trim()}`
    : 'ชื่อเรื่อง: (ให้คุณตั้งให้)';

  // The header must match the mode: in drama mode ctx carries no sales fields
  // (creativeCtx returns only { cast }/undefined), so presence of any sales
  // field is a reliable signal that this is a sales clip.
  const isSales = !!(
    ctx?.salesStyle ||
    ctx?.productName?.trim() ||
    ctx?.productDetail?.trim()
  );
  const header = isSales
    ? 'สร้างบทคลิปขายของแนวตั้ง (ละครสั้นที่ปิดการขายอย่างเป็นธรรมชาติ) จากข้อมูลนี้'
    : 'สร้างบทละครสั้นแนวตั้ง จากข้อมูลนี้';

  return `${header}

${titleLine}
หัวข้อ/แนวคิด:
${form.topic.trim()}
${contextBlock(ctx)}
จำนวนตอน: ${form.episodeCount} ตอน (ep เรียง 1..${form.episodeCount})
จำนวนฉากต่อตอน: ${form.scenesPerEpisode} ฉาก
สไตล์ภาพ: ${form.style}
อัตราส่วนภาพ: ${form.aspectRatio} (${form.aspectRatio === '16:9' ? 'แนวนอน' : 'แนวตั้ง'})

ข้อกำหนด:
- ชื่อเรื่อง (title), เรื่องย่อ (logline), ตัวละคร และทุกฉาก ต้อง "สอดคล้องกับหัวข้อ/แนวคิดด้านบน" อย่างซื่อตรง — หัวข้อคือแก่นเรื่อง ห้ามออกนอกเรื่องหรือเปลี่ยนแก่น
- ต้องมี episodes ครบ ${form.episodeCount} ตอน และทุกตอนต้องมี scenes ครบ ${form.scenesPerEpisode} ฉาก
- เล่าเป็น "เรื่องเดียวที่ต่อเนื่องกันทั้งหมด" — ทุกฉากสืบเนื่องจากฉากก่อนหน้า (เหตุ→ผล, ไทม์ไลน์เดิน) ไม่ใช่ฉากแยกกัน
- ใส่ "styleBible" (ลุครวมล็อกไว้) และให้ทุกตัวละครมี "appearance" (อัตลักษณ์ภาพล็อกไว้) — ใช้เหมือนเดิมทุกฉากเพื่อหน้าตา/ชุดไม่เพี้ยน
- ทุก scene ใส่ "characters" (ชื่อตัวละครในฉาก) และ "continuity" (โน้ตความต่อเนื่องจากฉากก่อน)
- ทุก visualPrompt เริ่มด้วย "${form.style}" บรรยายเฉพาะฉากนั้น และลงท้ายด้วยประโยคความปลอดภัย
- ทุก videoPrompt เริ่มด้วยการเชื่อมจากช็อตก่อน + คำสั่งกล้อง + บทพูดในเครื่องหมายคำพูด + ลงท้ายด้วยประโยคความปลอดภัย
- ตอบเป็น JSON ตามโครงสร้างที่กำหนดเท่านั้น`;
}

/** Finalize an AI-returned image prompt (ensure style prefix + safety suffix). */
export function finalizeImagePrompt(text: string, style: VisualStyle): string {
  return ensureSafety(ensureStyle(text, style));
}
/** Finalize an AI-returned video prompt (ensure safety suffix). */
export function finalizeVideoPrompt(text: string): string {
  return ensureSafety(text);
}

function ctxForRegen(ctx?: CreativeContext): string {
  const parts: string[] = [];
  if (ctx?.styleBible?.trim()) {
    parts.push(`Locked global look (keep identical): ${ctx.styleBible.trim()}`);
  }
  if (ctx?.salesStyle) {
    parts.push(`Selling tone: ${ctx.salesStyle.label} — ${ctx.salesStyle.instruction}`);
  }
  if (ctx?.productName?.trim() || ctx?.productDetail?.trim()) {
    parts.push(
      `Product to feature prominently: ${ctx?.productName?.trim() || ''}${
        ctx?.productDetail?.trim() ? ` — ${ctx.productDetail.trim()}` : ''
      }`
    );
  }
  if (ctx?.cast && ctx.cast.length) {
    parts.push(
      `Characters (use these EXACT descriptions verbatim for identity consistency): ${ctx.cast.join(' | ')}`
    );
  }
  return parts.join('\n');
}

/** AI instruction to regenerate ONE scene's image prompt (returns English prompt only). */
export function buildImageRegenPrompt(
  scene: Scene,
  style: VisualStyle,
  ctx?: CreativeContext,
  aspectRatio: '9:16' | '16:9' = '9:16'
): string {
  const orient = aspectRatio === '16:9' ? 'horizontal/landscape' : 'vertical';
  return `Rewrite the IMAGE prompt for this single ${aspectRatio} (${orient}) scene. Output ONLY the English image prompt — no explanation, no quotes, no markdown.

Start with the visual style "${style}". Describe the subject, setting, lighting, camera angle, composition. ${ctxForRegen(
    ctx
  )}
CONTINUITY: keep the overall look and every character's face/outfit IDENTICAL to the rest of the series — do not redesign them.${
    scene.characters?.length ? ` Characters present: ${scene.characters.join(', ')}.` : ''
  }

Scene:
- setting: ${scene.setting}
- action: ${scene.action}
- dialogue (Thai, for context): ${scene.dialogue}

End with exactly: ${SAFETY_SUFFIX}`;
}

/** AI instruction to regenerate ONE scene's image-to-video prompt (English only). */
export function buildVideoRegenPrompt(
  scene: Scene,
  style: VisualStyle,
  ctx?: CreativeContext,
  aspectRatio: '9:16' | '16:9' = '9:16'
): string {
  const orient = aspectRatio === '16:9' ? 'horizontal/landscape' : 'vertical';
  return `Rewrite the IMAGE-TO-VIDEO prompt for this single ${aspectRatio} (${orient}) scene. Output ONLY the English prompt — no explanation, no markdown.

Begin by continuing from the previous shot (seamless flow). Describe what MOVES/changes (camera direction + character motion), keep it ~8 seconds, and include the spoken line in quotes. ${ctxForRegen(
    ctx
  )}
CONTINUITY: keep the overall look and every character's face/outfit IDENTICAL to the rest of the series — do not redesign them.${
    scene.characters?.length ? ` Characters present: ${scene.characters.join(', ')}.` : ''
  }

Scene:
- setting: ${scene.setting}
- action: ${scene.action}
- spoken line (Thai): "${scene.dialogue}"

End with exactly: ${SAFETY_SUFFIX}`;
}

function ensureSafety(prompt: string): string {
  const p = String(prompt ?? '').trim();
  if (!p) return SAFETY_SUFFIX;
  if (p.includes(SAFETY_SUFFIX)) return p;
  return `${p.replace(/[.\s]+$/, '')}. ${SAFETY_SUFFIX}`;
}

function ensureStyle(prompt: string, style: VisualStyle): string {
  const p = String(prompt ?? '').trim();
  if (!p) return `${style}. ${SAFETY_SUFFIX}`;
  // If it doesn't already begin with the style, prepend it.
  return p.toLowerCase().startsWith(style.toLowerCase()) ? p : `${style}, ${p}`;
}

function normName(s: unknown): string {
  return String(s ?? '').trim().toLowerCase();
}

/** Continuity context shared by every scene of one drama. */
type ContinuityCtx = {
  styleBible?: string;
  /** normalized name → locked English appearance. */
  appearanceByName: Map<string, string>;
};

/**
 * The locked-look + present-cast identity clause appended to each scene prompt.
 * This is what makes every independently-generated image/clip share the same
 * world and the same faces/outfits — the heart of the continuity engine.
 */
function sceneAnchor(present: string[], cont?: ContinuityCtx): string {
  if (!cont) return '';
  const parts: string[] = [];
  if (cont.styleBible?.trim()) parts.push(cont.styleBible.trim());
  // Use the characters tagged in this scene; if none tagged, lock all of them.
  const names = present.length ? present : [...cont.appearanceByName.keys()];
  const looks = names
    .map((n) => cont.appearanceByName.get(normName(n)))
    .filter((s): s is string => !!s && s.trim().length > 0);
  // de-dup while keeping order
  const uniqLooks = [...new Set(looks)];
  if (uniqLooks.length) parts.push(`consistent character identity — ${uniqLooks.join('; ')}`);
  return parts.join('. ');
}

/** Append the locked continuity clause (idempotent) — run BEFORE ensureSafety. */
function ensureContinuity(prompt: string, anchor: string): string {
  const p = String(prompt ?? '').trim();
  const a = anchor.trim();
  if (!a) return p;
  if (p.includes(a)) return p;
  return `${p.replace(/[.\s]+$/, '')}. Continuity: ${a}`;
}

function normScene(raw: unknown, style: VisualStyle, cont?: ContinuityCtx): Scene {
  const o = (raw ?? {}) as Record<string, unknown>;
  const characters = Array.isArray(o.characters)
    ? o.characters.map((c) => String(c ?? '').trim()).filter(Boolean)
    : [];
  const anchor = sceneAnchor(characters, cont);
  const visualPrompt = ensureSafety(
    ensureContinuity(ensureStyle(String(o.visualPrompt ?? ''), style), anchor)
  );
  const videoPrompt = ensureSafety(ensureContinuity(String(o.videoPrompt ?? ''), anchor));
  return {
    setting: String(o.setting ?? '').trim() || '—',
    action: String(o.action ?? '').trim(),
    dialogue: String(o.dialogue ?? '').trim(),
    ...(characters.length ? { characters } : {}),
    ...(String(o.continuity ?? '').trim() ? { continuity: String(o.continuity).trim() } : {}),
    visualPrompt,
    videoPrompt,
    duration: String(o.duration ?? '8s').trim() || '8s',
  };
}

function normCharacter(raw: unknown): Character {
  const o = (raw ?? {}) as Record<string, unknown>;
  const appearance = String(o.appearance ?? '').trim();
  return {
    name: String(o.name ?? 'ตัวละคร').trim() || 'ตัวละคร',
    description: String(o.description ?? '').trim(),
    ...(appearance ? { appearance } : {}),
  };
}

/**
 * Parse + normalize the model's drama JSON. Throws Error (Thai) when the shape
 * is unusable. Guarantees: every prompt has style prefix + safety suffix,
 * episodes are re-numbered 1..N, empty episodes/scenes are dropped.
 */
export function parseDrama(raw: string, style: VisualStyle): Drama {
  const parsed = parseJSON<Record<string, unknown>>(raw);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI ตอบกลับมาในรูปแบบที่ไม่ถูกต้อง ลองอีกครั้ง');
  }

  // Parse the drama-wide continuity locks FIRST so every scene can embed them.
  const styleBible = String(parsed.styleBible ?? '').trim();
  const charsRaw = Array.isArray(parsed.characters) ? parsed.characters : [];
  const characters = charsRaw.map(normCharacter);
  const appearanceByName = new Map<string, string>();
  for (const c of characters) {
    if (c.appearance?.trim()) appearanceByName.set(normName(c.name), c.appearance.trim());
  }
  const cont: ContinuityCtx = {
    styleBible: styleBible || undefined,
    appearanceByName,
  };

  const epsRaw = Array.isArray(parsed.episodes) ? parsed.episodes : [];
  const episodes: Episode[] = epsRaw
    .map((e, i): Episode => {
      const eo = (e ?? {}) as Record<string, unknown>;
      const scenesRaw = Array.isArray(eo.scenes) ? eo.scenes : [];
      return {
        ep: Number.isFinite(Number(eo.ep)) ? Number(eo.ep) : i + 1,
        scenes: scenesRaw.map((s) => normScene(s, style, cont)),
      };
    })
    .filter((e) => e.scenes.length > 0)
    // Re-number sequentially so the UI labels are always 1..N.
    .map((e, i) => ({ ...e, ep: i + 1 }));

  if (episodes.length === 0) {
    throw new Error('AI ไม่ได้สร้างฉากใด ๆ กลับมา ลองปรับหัวข้อแล้วลองอีกครั้ง');
  }

  return {
    title: String(parsed.title ?? 'ละครสั้นไม่มีชื่อ').trim() || 'ละครสั้นไม่มีชื่อ',
    logline: String(parsed.logline ?? '').trim(),
    ...(styleBible ? { styleBible } : {}),
    characters,
    episodes,
  };
}
