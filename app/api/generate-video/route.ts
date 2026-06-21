// app/api/generate-video/route.ts — generate a short video via the local ai-flow CLI.
//
// POST { prompt: string, tool: 'grok' }
//   -> { ok: true, dataUrl: "data:video/mp4;base64,..." }   (200)
//   -> { ok: false, error: string }                          (400 / 502)
//
// 'grok' -> ai-flow `grok-video` (Grok Imagine → MP4, ~6s). This is SLOW
// (~2-5 min); runAiFlow uses a ~7-min timeout for mp4 output. The CLI drives the
// user's logged-in Grok browser profile, independent of this app's Firebase auth.

import { runAiFlow, fileToDataUrlAndUnlink } from '@/lib/aiflow';

export const runtime = 'nodejs';

// give the route headroom over runAiFlow's 420s mp4 timeout
export const maxDuration = 480;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Map a raw CLI failure to a friendly Thai message. */
function friendlyError(raw: string): string {
  const lower = raw.toLowerCase();
  if (
    lower.includes('not ready') ||
    lower.includes('composer not ready') ||
    raw.includes('ยังไม่ล็อกอิน') ||
    lower.includes('not logged in') ||
    lower.includes('login')
  ) {
    return 'เซสชัน grok ยังไม่ล็อกอิน — รัน: ai-flow login grok';
  }
  if (lower.includes('timeout') || raw.includes('หมดเวลา')) {
    return 'สร้างวิดีโอไม่ทันเวลา — Grok วิดีโอใช้เวลานาน ลองใหม่อีกครั้ง หรือเช็กหน้าต่าง browser ของ grok';
  }
  return `สร้างวิดีโอไม่สำเร็จ: ${raw.trim().slice(0, 300)}`;
}

export async function POST(req: Request) {
  let body: { prompt?: unknown; tool?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'รูปแบบคำขอไม่ถูกต้อง (invalid JSON)' }, 400);
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return json({ ok: false, error: 'กรุณาระบุ prompt สำหรับสร้างวิดีโอ' }, 400);
  }

  // only grok video is supported today; default to it.
  const tool = body.tool === 'grok' || body.tool === undefined ? 'grok' : null;
  if (!tool) {
    return json({ ok: false, error: `เครื่องมือวิดีโอไม่รองรับ: ${String(body.tool)} (รองรับเฉพาะ 'grok')` }, 400);
  }

  try {
    const outPath = await runAiFlow('grok-video', prompt, 'mp4');
    const dataUrl = await fileToDataUrlAndUnlink(outPath);
    return json({ ok: true, dataUrl });
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: friendlyError(raw) }, 502);
  }
}
