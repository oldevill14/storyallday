// app/api/character-sheet/route.ts — generate a Character Design Sheet FROM a
// reference image, via ai-flow `image-ref` (ChatGPT /images, image-to-image).
//
// POST { prompt: string, refImage: dataURL }
//   -> { ok: true, dataUrl }   (200)
//   -> { ok: false, error }    (400 / 502)
//
// Drives the user's logged-in ChatGPT browser profile (independent of app auth).
// Needs `ai-flow login chatgpt` first.

import { runAiFlowImageRef, fileToDataUrlAndUnlink } from '@/lib/aiflow';

export const runtime = 'nodejs';
export const maxDuration = 480;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function friendlyError(raw: string, engine: 'chatgpt' | 'grok'): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes('not ready') ||
    lower.includes('composer not ready') ||
    raw.includes('ยังไม่ล็อกอิน') ||
    lower.includes('login') ||
    lower.includes('not logged in')
  ) {
    return `เซสชัน ${engine} ยังไม่ล็อกอิน — รัน: ai-flow login ${engine} บนเครื่องนี้ก่อน`;
  }
  if (lower.includes('timeout') || raw.includes('หมดเวลา')) {
    return 'สร้าง Character Sheet ไม่ทันเวลา — ลองใหม่ หรือเช็กหน้าต่าง ChatGPT';
  }
  if (raw.includes('รูปอ้างอิงไม่ถูกต้อง')) return raw;
  return `สร้าง Character Sheet ไม่สำเร็จ: ${raw.trim().slice(0, 300)}`;
}

export async function POST(req: Request) {
  let body: { prompt?: unknown; refImage?: unknown; engine?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'รูปแบบคำขอไม่ถูกต้อง (invalid JSON)' }, 400);
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const refImage = typeof body.refImage === 'string' ? body.refImage : '';
  const engine: 'chatgpt' | 'grok' = body.engine === 'grok' ? 'grok' : 'chatgpt';
  if (!prompt) return json({ ok: false, error: 'ไม่มี prompt' }, 400);
  if (!refImage.startsWith('data:image/')) {
    return json({ ok: false, error: 'ต้องมีรูปอ้างอิงก่อน — อัปโหลดรูปในตัวละครก่อนสร้าง Sheet' }, 400);
  }

  try {
    const outPath = await runAiFlowImageRef(prompt, refImage, engine);
    const dataUrl = await fileToDataUrlAndUnlink(outPath);
    return json({ ok: true, dataUrl });
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: friendlyError(raw, engine) }, 502);
  }
}
