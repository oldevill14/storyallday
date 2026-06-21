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

หน้าที่ของคุณ: แตกหัวข้อ/แนวคิดที่ได้รับ ออกเป็นเรื่อง → ตอน → ฉาก พร้อม prompt สำหรับสร้างภาพและวิดีโอแบบ image-to-video

ข้อบังคับด้านความปลอดภัย (WorkD safety — ห้ามฝ่าฝืน):
- ตัวละครทุกตัวต้องเป็น "ผู้ใหญ่" เท่านั้น (adult) — ห้ามมีเด็กหรือผู้เยาว์โดยเด็ดขาด หากบทต้องการตัวละครอายุน้อย ให้ระบุเป็นผู้ใหญ่ (adult) เสมอ
- ห้ามใช้ชื่อดารา ชื่อบุคคลจริง หรือชื่อแบรนด์จริงทุกชนิด ใช้ชื่อสมมติเท่านั้น
- เนื้อหาต้องปลอดภัยเชิงพาณิชย์ ไม่มีความรุนแรง ไม่มีเนื้อหาผู้ใหญ่ ไม่ละเมิดลิขสิทธิ์
- ทุกค่า visualPrompt และ videoPrompt ต้องลงท้ายด้วยประโยคนี้เป๊ะ ๆ (ภาษาอังกฤษ): "${SAFETY_SUFFIX}"

ข้อกำหนดของ prompt:
- visualPrompt: ภาษาอังกฤษ เริ่มต้นด้วยสไตล์ภาพ "${style}" แล้วตามด้วยรายละเอียดฉาก ตัวละคร แสง มุมกล้อง องค์ประกอบ สำหรับอัตราส่วน ${aspectRatio} (${orient}) จบด้วยประโยคความปลอดภัย
- videoPrompt: ภาษาอังกฤษ เป็นคำสั่ง image-to-video — บอกการเคลื่อนไหวกล้อง (camera direction) การเคลื่อนไหวของตัวละคร และใส่บทพูดในเครื่องหมายคำพูด ("...") จบด้วยประโยคความปลอดภัย
- dialogue: ภาษาไทย เป็นบทพูดของตัวละครในฉากนั้น
- duration: ระยะเวลาคลิป ใช้ "8s"

ตอบกลับเป็น JSON เท่านั้น (ไม่มีคำอธิบาย ไม่มี markdown code fence) ตามโครงสร้างนี้เป๊ะ ๆ:
{
  "title": "ชื่อเรื่อง (ไทย)",
  "logline": "เรื่องย่อ 1-2 ประโยค (ไทย)",
  "characters": [{ "name": "ชื่อสมมติ", "description": "คำอธิบายตัวละคร (ผู้ใหญ่)" }],
  "episodes": [
    {
      "ep": 1,
      "scenes": [
        {
          "setting": "สถานที่/บรรยากาศฉาก (ไทย)",
          "action": "สิ่งที่เกิดขึ้นในฉาก (ไทย)",
          "dialogue": "บทพูด (ไทย)",
          "visualPrompt": "${style}, ... , ${SAFETY_SUFFIX}",
          "videoPrompt": "Camera ... \\"dialogue here\\" ... , ${SAFETY_SUFFIX}",
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
      'ตัวละครหลัก (ต้องใช้ตัวละครเหล่านี้เท่านั้น และคัดลอกคำบรรยายลักษณะ "เป๊ะ ๆ" ลงในทุก visualPrompt/videoPrompt เพื่อให้หน้าตา/สไตล์คงที่ทุกฉาก):'
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
- ต้องมี episodes ครบ ${form.episodeCount} ตอน และทุกตอนต้องมี scenes ครบ ${form.scenesPerEpisode} ฉาก
- รักษาความต่อเนื่องของเรื่องและตัวละครข้ามตอน/ฉาก
- ทุก visualPrompt เริ่มด้วย "${form.style}" และลงท้ายด้วยประโยคความปลอดภัย
- ทุก videoPrompt มีคำสั่งกล้อง + บทพูดในเครื่องหมายคำพูด + ลงท้ายด้วยประโยคความปลอดภัย
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

Describe what MOVES/changes (camera direction + character motion), keep it ~8 seconds, and include the spoken line in quotes. ${ctxForRegen(
    ctx
  )}

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

function normScene(raw: unknown, style: VisualStyle): Scene {
  const o = (raw ?? {}) as Record<string, unknown>;
  const visualPrompt = ensureSafety(ensureStyle(String(o.visualPrompt ?? ''), style));
  const videoPrompt = ensureSafety(String(o.videoPrompt ?? ''));
  return {
    setting: String(o.setting ?? '').trim() || '—',
    action: String(o.action ?? '').trim(),
    dialogue: String(o.dialogue ?? '').trim(),
    visualPrompt,
    videoPrompt,
    duration: String(o.duration ?? '8s').trim() || '8s',
  };
}

function normCharacter(raw: unknown): Character {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    name: String(o.name ?? 'ตัวละคร').trim() || 'ตัวละคร',
    description: String(o.description ?? '').trim(),
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

  const epsRaw = Array.isArray(parsed.episodes) ? parsed.episodes : [];
  const episodes: Episode[] = epsRaw
    .map((e, i): Episode => {
      const eo = (e ?? {}) as Record<string, unknown>;
      const scenesRaw = Array.isArray(eo.scenes) ? eo.scenes : [];
      return {
        ep: Number.isFinite(Number(eo.ep)) ? Number(eo.ep) : i + 1,
        scenes: scenesRaw.map((s) => normScene(s, style)),
      };
    })
    .filter((e) => e.scenes.length > 0)
    // Re-number sequentially so the UI labels are always 1..N.
    .map((e, i) => ({ ...e, ep: i + 1 }));

  if (episodes.length === 0) {
    throw new Error('AI ไม่ได้สร้างฉากใด ๆ กลับมา ลองปรับหัวข้อแล้วลองอีกครั้ง');
  }

  const charsRaw = Array.isArray(parsed.characters) ? parsed.characters : [];

  return {
    title: String(parsed.title ?? 'ละครสั้นไม่มีชื่อ').trim() || 'ละครสั้นไม่มีชื่อ',
    logline: String(parsed.logline ?? '').trim(),
    characters: charsRaw.map(normCharacter),
    episodes,
  };
}
