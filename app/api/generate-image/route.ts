// app/api/generate-image/route.ts — generate an image via the local ai-flow CLI.
//
// POST { prompt: string, provider: 'chatgpt' | 'grok' }
//   -> { ok: true, dataUrl: "data:image/...;base64,..." }   (200)
//   -> { ok: false, error: string }                          (400 / 502)
//
// 'grok'    -> ai-flow `grok-image` (Grok Imagine → JPEG)
// 'chatgpt' -> ai-flow `image`      (ChatGPT Images → PNG)
//
// The CLI drives the user's logged-in browser profiles, which are INDEPENDENT of
// this app's Firebase auth. If a profile isn't logged in, we surface a Thai hint
// telling the user which `ai-flow login` to run.

import { runAiFlow, runAiFlowImageRef, fileToDataUrlAndUnlink } from '@/lib/aiflow';

export const runtime = 'nodejs';
export const maxDuration = 480;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

type ImageProvider = 'chatgpt' | 'grok';

// provider → [ai-flow subcommand, output extension]
const SUB_BY_PROVIDER: Record<ImageProvider, readonly [string, string]> = {
  grok: ['grok-image', 'jpg'],
  chatgpt: ['image', 'png'],
};

/** Map a raw CLI failure to a friendly Thai message. */
function friendlyError(provider: ImageProvider, raw: string): string {
  const lower = raw.toLowerCase();
  // CLI heuristics for "session not ready / not logged in":
  // composer-not-ready, login redirects, "ยังไม่ล็อกอิน", etc.
  if (
    lower.includes('not ready') ||
    lower.includes('composer not ready') ||
    raw.includes('ยังไม่ล็อกอิน') ||
    lower.includes('not logged in') ||
    lower.includes('login')
  ) {
    return `เซสชัน ${provider} ยังไม่ล็อกอิน — รัน: ai-flow login ${provider}`;
  }
  if (lower.includes('timeout') || raw.includes('หมดเวลา')) {
    return `สร้างภาพไม่ทันเวลา (${provider}) — ลองใหม่อีกครั้ง หรือเช็กหน้าต่าง browser ของ ${provider}`;
  }
  return `สร้างภาพไม่สำเร็จ (${provider}): ${raw.trim().slice(0, 300)}`;
}

export async function POST(req: Request) {
  let body: { prompt?: unknown; provider?: unknown; refImage?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ ok: false, error: 'รูปแบบคำขอไม่ถูกต้อง (invalid JSON)' }, 400);
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return json({ ok: false, error: 'กรุณาระบุ prompt สำหรับสร้างภาพ' }, 400);
  }

  // default to grok (faster / cheaper for iteration)
  const provider: ImageProvider = body.provider === 'chatgpt' ? 'chatgpt' : 'grok';
  const [sub, ext] = SUB_BY_PROVIDER[provider];

  // When a character reference image is provided, lock the character's look via
  // image-to-image (image-ref / grok-image-ref) instead of plain text-to-image.
  const refImage =
    typeof body.refImage === 'string' && body.refImage.startsWith('data:image/')
      ? body.refImage
      : '';

  try {
    const outPath = refImage
      ? await runAiFlowImageRef(prompt, refImage, provider)
      : await runAiFlow(sub, prompt, ext);
    const dataUrl = await fileToDataUrlAndUnlink(outPath);
    return json({ ok: true, dataUrl });
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: friendlyError(provider, raw) }, 502);
  }
}
