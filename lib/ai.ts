// lib/ai.ts — Client helpers that call the AI providers DIRECTLY from the browser
// (no server proxy — the app is a static export). Public function signatures
// (callAI / suggestAngles / draftPost) are unchanged from the proxy era so pages
// and the ModelPicker don't need to change.
//
// Browser/CORS reality:
//   - openrouter → allows browser requests (send HTTP-Referer + X-Title).
//   - gemini     → generativelanguage.googleapis.com allows CORS with ?key=.
//   - openai / anthropic / zai → block direct browser calls via CORS. We still
//     attempt the call, but a CORS/network failure is rethrown as a clear Thai
//     error telling the user to use OpenRouter/Gemini on the deployed site.

import type { AISettings, Angle, Brand, Provider } from './types';

/** Providers that work directly from a browser (CORS-allowed). */
const BROWSER_OK: Provider[] = ['openrouter', 'gemini'];

/** Default base URLs per provider (used when settings.baseUrl is empty). */
const DEFAULT_BASE_URLS: Record<Provider, string> = {
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  zai: 'https://api.z.ai/api/anthropic',
  gemini: 'https://generativelanguage.googleapis.com',
  openrouter: 'https://openrouter.ai/api/v1',
};

/** Thrown when a CORS-blocked provider is called from the browser. */
const CORS_MESSAGE =
  'provider นี้เรียกตรงจากเบราว์เซอร์ไม่ได้ (CORS) — ใช้ OpenRouter หรือ Gemini สำหรับเว็บที่ deploy แล้ว (provider อื่นใช้ได้ตอน npm run dev เท่านั้น)';

/** Pull a human-readable error message out of an unknown provider payload. */
function extractProviderError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const p = payload as Record<string, unknown>;
  const err = p.error;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const m = (err as Record<string, unknown>).message;
    if (typeof m === 'string') return m;
  }
  if (typeof p.message === 'string') return p.message;
  return fallback;
}

/** `location.origin` if available (browser), else a stable fallback. */
function originHeader(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://oldevill14.github.io';
}

/**
 * Low-level call to an AI provider — now DIRECT from the browser (no /api/ai).
 * Sends settings + a single user message and returns the normalized text.
 * Throws a clear Error on validation, CORS/network, provider, or empty result.
 */
export async function callAI(
  opts: { system?: string; prompt: string },
  settings: AISettings
): Promise<string> {
  const provider = settings.provider;
  if (!provider || !DEFAULT_BASE_URLS[provider]) {
    throw new Error(`ไม่รู้จัก provider: ${String(provider)}`);
  }
  if (!settings.apiKey || !settings.apiKey.trim()) {
    throw new Error('ยังไม่ได้ตั้งค่า API key — ตั้งค่า API key ในหน้าตั้งค่าก่อน');
  }
  if (!settings.model || !settings.model.trim()) {
    throw new Error('ยังไม่ได้เลือกโมเดล (model)');
  }

  const apiKey = settings.apiKey.trim();
  const model = settings.model.trim();
  const base =
    (settings.baseUrl && settings.baseUrl.trim()) || DEFAULT_BASE_URLS[provider];
  const { system } = opts;
  const messages = [{ role: 'user' as const, content: opts.prompt }];

  let url: string;
  let headers: Record<string, string>;
  let payload: unknown;

  if (provider === 'openrouter') {
    // OpenRouter is OpenAI-compatible and allows browser requests.
    // Its base URL already ends in `/v1`, so append `/chat/completions`.
    url = `${base}/chat/completions`;
    headers = {
      'content-type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': originHeader(),
      'X-Title': 'Story AI',
    };
    payload = {
      model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...messages,
      ],
    };
  } else if (provider === 'gemini') {
    url = `${base}/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;
    headers = { 'content-type': 'application/json' };
    payload = {
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: messages.map((m) => ({
        role: 'user',
        parts: [{ text: m.content }],
      })),
    };
  } else if (provider === 'openai') {
    url = `${base}/v1/chat/completions`;
    headers = {
      'content-type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    };
    payload = {
      model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...messages,
      ],
    };
  } else {
    // anthropic | zai — Anthropic Messages API shape.
    url = `${base}/v1/messages`;
    headers = {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      // Opt-in header some Anthropic-compatible gateways require for browsers.
      'anthropic-dangerous-direct-browser-access': 'true',
    };
    payload = {
      model,
      max_tokens: 2048,
      ...(system ? { system } : {}),
      messages,
    };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // A TypeError("Failed to fetch") here is almost always a CORS preflight
    // rejection (openai/anthropic/zai) or a real network outage. Give the
    // CORS-blocked providers a precise, actionable Thai message.
    if (!BROWSER_OK.includes(provider)) {
      throw new Error(CORS_MESSAGE);
    }
    throw new Error(
      e instanceof Error
        ? `เชื่อมต่อผู้ให้บริการ AI ไม่สำเร็จ: ${e.message}`
        : 'เชื่อมต่อผู้ให้บริการ AI ไม่สำเร็จ'
    );
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = extractProviderError(data, `เรียก AI ไม่สำเร็จ (HTTP ${res.status})`);
    throw new Error(msg);
  }

  let text = '';
  if (provider === 'openai' || provider === 'openrouter') {
    text = data?.choices?.[0]?.message?.content ?? '';
  } else if (provider === 'anthropic' || provider === 'zai') {
    text = (data?.content ?? [])
      .filter((c: { type?: string }) => c?.type === 'text')
      .map((c: { text?: string }) => c?.text ?? '')
      .join('');
  } else {
    // gemini
    text = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p?.text ?? '')
      .join('');
  }

  if (!text) {
    throw new Error('AI ตอบกลับว่างเปล่า ลองอีกครั้ง');
  }
  return text;
}

/**
 * Robustly extract a JSON value from an LLM response: strips ``` fences and
 * finds the outermost {...} or [...] block. Throws a clear Error on failure.
 */
export function parseJSON<T = unknown>(raw: string): T {
  if (!raw || typeof raw !== 'string') {
    throw new Error('AI ไม่ได้ส่งข้อความกลับมา');
  }

  let text = raw.trim();

  // Strip fenced code blocks: ```json ... ``` or ``` ... ```
  const fence = text.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();

  // Find the outermost JSON container (object or array).
  const firstObj = text.indexOf('{');
  const firstArr = text.indexOf('[');
  let start = -1;
  let close = '}';
  if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
    start = firstArr;
    close = ']';
  } else if (firstObj !== -1) {
    start = firstObj;
  }

  if (start !== -1) {
    const last = text.lastIndexOf(close);
    if (last > start) {
      text = text.slice(start, last + 1);
    }
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('AI ตอบกลับมาในรูปแบบที่อ่านไม่ได้ (JSON ไม่ถูกต้อง) ลองอีกครั้ง');
  }
}

function brandBlock(brand: Brand): string {
  return [
    `ชื่อแบรนด์: ${brand.name}`,
    `ธุรกิจ: ${brand.business}`,
    `โทนเสียง: ${brand.tone}`,
    `ภาษา: ${brand.language}`,
    `กลุ่มเป้าหมาย: ${brand.audience}`,
    `คีย์เวิร์ด: ${brand.keywords.join(', ')}`,
  ].join('\n');
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function clampConfidence(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 80;
  return Math.max(0, Math.min(100, Math.round(v)));
}

const ANGLE_SYSTEM =
  'คุณคือนักวางกลยุทธ์คอนเทนต์เพจไทย เชี่ยวชาญการคิดมุมคอนเทนต์ที่เข้าถึงกลุ่มเป้าหมายและกระตุ้น engagement ตอบเป็นภาษาไทยเสมอ';

/**
 * Ask the AI for 5 content angles tailored to the brand.
 * Returns Angle[] with id + createdAt filled in.
 */
export async function suggestAngles(
  brand: Brand,
  settings: AISettings
): Promise<Angle[]> {
  const prompt = `จากข้อมูลแบรนด์ด้านล่าง ช่วยเสนอ "มุมคอนเทนต์" 5 มุม ที่น่าโพสต์ตอนนี้

${brandBlock(brand)}

ตอบกลับเป็น JSON array เท่านั้น (ไม่ต้องมีคำอธิบายอื่น) โดยแต่ละรายการมีฟิลด์:
- title: หัวข้อคอนเทนต์ (ภาษาไทย กระชับ ดึงดูด)
- category: หมวดหมู่ เลือกจาก ["สำหรับคุณ","เทรนด์วันนี้","ให้ความรู้","เทศกาล","โลคัลสไตล์"]
- confidence: ความมั่นใจ 0-100 (ตัวเลข)
- rationale: เหตุผลว่าทำไมมุมนี้เวิร์ก (1-2 ประโยค)
- format: รูปแบบที่แนะนำ เช่น "ภาพเดี่ยว", "คารูเซล", "วิดีโอสั้น"

ตัวอย่างรูปแบบ:
[{"title":"...","category":"เทรนด์วันนี้","confidence":88,"rationale":"...","format":"ภาพเดี่ยว"}]`;

  const text = await callAI({ system: ANGLE_SYSTEM, prompt }, settings);
  const parsed = parseJSON<unknown>(text);

  const arr = Array.isArray(parsed)
    ? parsed
    : (parsed as { angles?: unknown[] })?.angles;

  if (!Array.isArray(arr)) {
    throw new Error('AI ไม่ได้ส่งรายการมุมคอนเทนต์กลับมา ลองอีกครั้ง');
  }

  const now = new Date().toISOString();
  return arr.slice(0, 5).map((item) => {
    const o = (item ?? {}) as Record<string, unknown>;
    return {
      id: uid('angle'),
      title: String(o.title ?? 'มุมคอนเทนต์ใหม่'),
      category: String(o.category ?? 'สำหรับคุณ'),
      confidence: clampConfidence(o.confidence),
      rationale: String(o.rationale ?? ''),
      format: String(o.format ?? 'ภาพเดี่ยว'),
      createdAt: now,
    } satisfies Angle;
  });
}

const DRAFT_SYSTEM =
  'คุณคือนักเขียนคอนเทนต์โซเชียลมีเดียมืออาชีพสำหรับเพจไทย เขียนแคปชั่นที่มี hook เปิดเด่น เนื้อหากระชับ และปิดท้ายด้วย CTA ที่ชัดเจน ตอบเป็นภาษาไทยเสมอ';

/**
 * Draft a full post (caption + hashtags + image idea) from an angle.
 */
export async function draftPost(
  angle: Angle,
  brand: Brand,
  settings: AISettings
): Promise<{ caption: string; hashtags: string[]; imageIdea: string }> {
  const prompt = `เขียนโพสต์โซเชียลมีเดีย 1 ชิ้น จากมุมคอนเทนต์นี้

มุมคอนเทนต์: ${angle.title}
รูปแบบ: ${angle.format}
เหตุผล: ${angle.rationale}

ข้อมูลแบรนด์:
${brandBlock(brand)}

ข้อกำหนด:
- caption: แคปชั่นภาษาไทย มี hook เปิด, เนื้อห้าที่ตรงกลุ่มเป้าหมาย และปิดด้วย CTA
- hashtags: 3-6 แฮชแท็กภาษาไทย/อังกฤษ (รวม # ด้วย)
- imageIdea: ไอเดียภาพประกอบสั้นๆ 1 ประโยค

ตอบกลับเป็น JSON object เท่านั้น รูปแบบ:
{"caption":"...","hashtags":["#...","#..."],"imageIdea":"..."}`;

  const text = await callAI({ system: DRAFT_SYSTEM, prompt }, settings);
  const o = parseJSON<Record<string, unknown>>(text);

  if (!o || typeof o !== 'object') {
    throw new Error('AI ตอบกลับมาในรูปแบบที่ไม่ถูกต้อง ลองอีกครั้ง');
  }

  const caption = String(o.caption ?? '').trim();
  if (!caption) {
    throw new Error('AI ไม่ได้สร้างแคปชั่น ลองอีกครั้ง');
  }

  const rawTags = Array.isArray(o.hashtags) ? o.hashtags : [];
  const hashtags = rawTags
    .map((t) => String(t).trim())
    .filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`));

  return {
    caption,
    hashtags,
    imageIdea: String(o.imageIdea ?? '').trim(),
  };
}

// ───────────────────────── OpenRouter model catalog ─────────────────────────
// Previously served by app/api/openrouter-models/route.ts (now deleted for the
// static export). The catalog endpoint is public + CORS-friendly, so the
// ModelPicker fetches it directly via fetchOpenRouterModels().

/** A single model row as consumed by the client picker. */
export type OpenRouterModel = {
  id: string;
  name: string;
  context_length: number;
  /** USD per token for input — Number(pricing.prompt). "-1" → variable. */
  promptPrice: number;
  /** USD per token for output — Number(pricing.completion). */
  completionPrice: number;
  /** Free if id ends with ":free" or the prompt price string is exactly "0". */
  free: boolean;
  description: string;
};

type RawOpenRouterModel = {
  id?: string;
  name?: string;
  context_length?: number;
  description?: string;
  pricing?: { prompt?: string; completion?: string };
};

/**
 * Fetch + map the public OpenRouter model catalog directly from the browser.
 * Throws a clear Thai Error on network/HTTP failure.
 */
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  let res: Response;
  try {
    res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { accept: 'application/json' },
    });
  } catch (e) {
    throw new Error(
      e instanceof Error
        ? `ดึงรายการโมเดลจาก OpenRouter ไม่สำเร็จ: ${e.message}`
        : 'ดึงรายการโมเดลจาก OpenRouter ไม่สำเร็จ'
    );
  }

  if (!res.ok) {
    throw new Error(`ดึงรายการโมเดลไม่สำเร็จ (HTTP ${res.status})`);
  }

  const data = (await res.json().catch(() => null)) as {
    data?: RawOpenRouterModel[];
  } | null;
  const raw = Array.isArray(data?.data) ? data.data : [];

  return raw.map((m) => {
    const id = String(m.id ?? '');
    const promptStr = m.pricing?.prompt ?? '0';
    const completionStr = m.pricing?.completion ?? '0';
    return {
      id,
      name: String(m.name ?? id),
      context_length: Number(m.context_length ?? 0),
      promptPrice: Number(promptStr),
      completionPrice: Number(completionStr),
      free: id.endsWith(':free') || promptStr === '0',
      description: String(m.description ?? ''),
    };
  });
}
