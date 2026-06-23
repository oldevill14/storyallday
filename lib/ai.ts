// lib/ai.ts — Client helpers that talk to the /api/ai proxy and build prompts.

import type { AISettings, Angle, Brand } from './types';

/** The connection fields callAI needs — a subset of AISettings (no `keys`). */
export type AIConnection = Pick<
  AISettings,
  'provider' | 'apiKey' | 'model' | 'baseUrl'
>;

/**
 * Low-level call to the AI proxy. POSTs settings + a single user message and
 * returns the normalized text. Throws on { error } or network failure.
 */
const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  zai: 'https://api.z.ai/api/anthropic',
  gemini: 'https://generativelanguage.googleapis.com',
  openrouter: 'https://openrouter.ai/api/v1',
  cli: 'local',
};

function parseDataUrl(d: string): { mediaType: string; data: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(d);
  return m ? { mediaType: m[1], data: m[2] } : null;
}

/**
 * Static build: call the configured provider DIRECTLY from the browser using the
 * user's own API key (no server proxy). CORS note — Gemini / OpenRouter / Anthropic
 * (+ z.ai with the direct-browser header) work from the browser; OpenAI blocks CORS;
 * the `cli` subscription mode only works when running on the local machine.
 */
export async function callAI(
  opts: { system?: string; prompt: string; image?: string },
  settings: AIConnection
): Promise<string> {
  const provider = settings.provider;
  const apiKey = (settings.apiKey || '').trim();
  const model = settings.model;
  const base = (settings.baseUrl && settings.baseUrl.trim()) || DEFAULT_BASE_URLS[provider] || '';
  const system = opts.system;
  const userText = opts.prompt;
  const img = opts.image ? parseDataUrl(opts.image) : null;

  if (provider === 'cli') {
    throw new Error(
      'โหมด CLI (subscription) ใช้ได้เฉพาะตอนรันบนเครื่อง — บนเว็บนี้ให้เลือก provider (Gemini / OpenRouter / z.ai / Anthropic) แล้วใส่ API Key ของบัญชีคุณในหน้าตั้งค่า',
    );
  }
  if (!apiKey) {
    throw new Error('ยังไม่ได้ใส่ API Key — ไปที่หน้าตั้งค่าเพื่อกรอกคีย์ของบัญชีคุณก่อน');
  }

  let url = '';
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  let payload: unknown;

  if (provider === 'openai' || provider === 'openrouter') {
    url = provider === 'openai' ? `${base}/v1/chat/completions` : `${base}/chat/completions`;
    headers.Authorization = `Bearer ${apiKey}`;
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = typeof location !== 'undefined' ? location.origin : 'https://story-ai';
      headers['X-Title'] = 'Story AI';
    }
    const content = img
      ? [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: opts.image } },
        ]
      : userText;
    payload = {
      model,
      messages: [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content }],
    };
  } else if (provider === 'anthropic' || provider === 'zai') {
    url = `${base}/v1/messages`;
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
    const content = img
      ? [
          { type: 'text', text: userText },
          { type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } },
        ]
      : userText;
    payload = {
      model,
      max_tokens: 8192,
      ...(system ? { system } : {}),
      messages: [{ role: 'user', content }],
    };
  } else {
    // gemini
    url = `${base}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const parts: unknown[] = [{ text: userText }];
    if (img) parts.push({ inline_data: { mime_type: img.mediaType, data: img.data } });
    payload = {
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: [{ role: 'user', parts }],
    };
  }

  let res: Response;
  try {
    res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  } catch {
    throw new Error(
      humanizeAIError(
        `เรียก ${provider} จากเบราว์เซอร์ไม่สำเร็จ (อาจติด CORS) — ลองใช้ Gemini / OpenRouter / z.ai`,
      ),
    );
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const raw =
      (data && (data.error?.message || (typeof data.error === 'string' && data.error) || data.message)) ||
      `HTTP ${res.status}`;
    throw new Error(humanizeAIError(String(raw)));
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
    text = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p?.text ?? '')
      .join('');
  }
  if (!text) throw new Error('AI ตอบกลับว่างเปล่า ลองอีกครั้ง');
  return text;
}

/**
 * Turn a raw provider error into an actionable Thai message. Recognizes the
 * common cases (no quota/billing, bad key, rate limit, bad model); otherwise
 * returns the original message.
 */
export function humanizeAIError(msg: string): string {
  const m = (msg || '').toLowerCase();
  if (/insufficient_quota|exceeded your (current )?quota|check your plan and billing|billing (details|hard limit)|quota (exceeded|reached)/.test(m)) {
    return 'บัญชีของผู้ให้บริการนี้เครดิต/โควต้าหมด หรือยังไม่ได้ตั้งค่าการเรียกเก็บเงิน (billing) — เติมเครดิตในบัญชีผู้ให้บริการก่อน แล้วลองใหม่ หรือสลับไปใช้ผู้ให้บริการอื่นที่พร้อมใช้งาน (เช่น GLM z.ai, OpenRouter โมเดลฟรี, Gemini)';
  }
  if (/invalid[_ ]api[_ ]key|incorrect api key|invalid authentication|unauthorized|\b401\b/.test(m)) {
    return 'API Key ไม่ถูกต้องหรือถูกเพิกถอน — ตรวจสอบและวางคีย์ใหม่อีกครั้ง';
  }
  if (/rate limit|too many requests|\b429\b/.test(m)) {
    return 'เรียกใช้งานถี่เกินไป (rate limit) — รอสักครู่แล้วลองใหม่';
  }
  if (/model.*(not found|does not exist)|unknown model|invalid model|no such model/.test(m)) {
    return 'ไม่พบโมเดลที่เลือกในบัญชีนี้ — เลือกโมเดลอื่น หรือพิมพ์ชื่อโมเดลให้ถูกต้อง';
  }
  return msg;
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
