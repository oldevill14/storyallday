// app/api/ai/route.ts — Server-side AI proxy (the "configurable API key" core).
//
// POST body: { provider, apiKey, model, baseUrl?, system?, messages:[{role,content}] }
// Returns:   { text } on success, or { error } with status 400/502 on failure.
//
// Calling the provider server-side avoids CORS and keeps the key off the wire
// to third parties (it still comes from the client store, but we don't expose
// provider responses' raw shape to the browser).

import { spawn } from 'node:child_process';
import type { AIProxyRequest, AIMessage, Provider } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

const DEFAULT_BASE_URLS: Record<Provider, string> = {
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  zai: 'https://api.z.ai/api/anthropic',
  gemini: 'https://generativelanguage.googleapis.com',
  openrouter: 'https://openrouter.ai/api/v1',
  cli: 'local',
};

// --- CLI (subscription) provider -------------------------------------------
// Runs a locally-installed, already-logged-in CLI so chat uses the user's
// SUBSCRIPTION instead of per-token API credits. Local-server mode only.

/** Spawn a CLI (args array — no shell, so prompts can't inject). */
function runCli(cmd: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(cmd, args, { timeout: timeoutMs });
    } catch (e) {
      reject(e);
      return;
    }
    let out = '';
    let err = '';
    child.stdout?.on('data', (d) => (out += d.toString()));
    child.stderr?.on('data', (d) => (err += d.toString()));
    child.on('error', (e: NodeJS.ErrnoException) =>
      reject(
        new Error(
          e.code === 'ENOENT'
            ? `ไม่พบคำสั่ง "${cmd}" บนเครื่อง — ติดตั้ง/ล็อกอิน CLI ก่อน`
            : e.message
        )
      )
    );
    child.on('close', (code, signal) => {
      if (code === 0) return resolve(out);
      // spawn({ timeout }) kills the child with SIGTERM when it runs too long →
      // code 143 (128+15) or null. Give an actionable message instead of a code.
      if (signal === 'SIGTERM' || code === 143 || code === null) {
        return reject(
          new Error(
            `"${cmd}" ใช้เวลานานเกิน ${Math.round(timeoutMs / 1000)} วินาที (timeout) — ` +
              'ลองลดจำนวนตอน/ฉาก หรือสลับไปใช้ API key (เช่น z.ai) ในหน้าตั้งค่าแทนโหมด CLI'
          )
        );
      }
      reject(new Error(err.trim() || out.trim() || `${cmd} ออกด้วยรหัส ${code}`));
    });
    child.stdin?.end();
  });
}

/** Flatten system + messages into a single prompt string for the CLI. */
function flattenPrompt(system: string | undefined, messages: AIMessage[]): string {
  const parts: string[] = [];
  if (system?.trim()) parts.push(`[ระบบ/แนวทาง]\n${system.trim()}`);
  for (const m of messages) parts.push(m.content);
  return parts.join('\n\n');
}

/** codex exec prints agent chatter; strip the noise to the actual answer. */
function cleanCodex(raw: string): string {
  const drop =
    /^(hook:|tokens used|user$|codex$|warning:|Reading additional|--------|\[?\d[\d,]*\]?$|thinking$)/i;
  const lines = raw
    .split('\n')
    .map((l) => l.replace(/\[[0-9;]*m/g, '').trimEnd()) // strip ANSI
    .filter((l) => l.trim() && !drop.test(l.trim()));
  return lines.join('\n').trim();
}

async function handleCli(
  model: string,
  system: string | undefined,
  messages: AIMessage[]
): Promise<Response> {
  const prompt = flattenPrompt(system, messages);
  if (!prompt.trim()) return json({ error: 'ไม่มีข้อความให้ประมวลผล' }, 400);
  const engine = (model || 'claude').trim();
  try {
    let text: string;
    if (engine === 'claude') {
      // Claude Code, logged in with a Claude subscription. Clean text output.
      // --strict-mcp-config (with no --mcp-config) loads ZERO MCP servers, so we
      // skip the user's heavy global MCP setup (obsidian/oracle/chrome/…) on every
      // call — much faster startup. 280s stays under the route's maxDuration (300).
      text = (await runCli('claude', ['-p', '--strict-mcp-config', prompt], 280_000)).trim();
    } else if (engine === 'codex') {
      // Codex CLI, logged in with ChatGPT. Output is chatty → clean it.
      const raw = await runCli(
        'codex',
        ['exec', '--skip-git-repo-check', prompt],
        240_000
      );
      text = cleanCodex(raw);
    } else if (engine.startsWith('ollama')) {
      // Local model, e.g. "ollama:llama3.1" → run llama3.1 (free/offline).
      const m = engine.includes(':') ? engine.slice(engine.indexOf(':') + 1) : 'llama3.1';
      text = (await runCli('ollama', ['run', m, prompt], 240_000)).trim();
    } else {
      return json({ error: `ไม่รู้จัก CLI engine: ${engine} (ใช้ claude / codex / ollama:<model>)` }, 400);
    }
    if (!text) return json({ error: 'CLI ตอบกลับว่างเปล่า ลองใหม่' }, 502);
    return json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'เรียก CLI ไม่สำเร็จ';
    return json({ error: msg }, 502);
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

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

// --- vision helpers (attach an image to the last user message) --------------

function hasImage(img: unknown): img is string {
  return typeof img === 'string' && img.startsWith('data:image/');
}
function parseDataUrl(dataUrl: string): { mediaType: string; base64: string } | null {
  const m = /^data:(image\/[a-z.+-]+);base64,(.+)$/i.exec(dataUrl);
  return m ? { mediaType: m[1], base64: m[2] } : null;
}
function lastUserIndex(msgs: AIMessage[]): number {
  for (let i = msgs.length - 1; i >= 0; i--) if (msgs[i].role === 'user') return i;
  return Math.max(0, msgs.length - 1);
}
/** OpenAI / OpenRouter multimodal: image_url with a data URL. */
function openaiMsgsWithImage(messages: AIMessage[], dataUrl: string): unknown[] {
  const idx = lastUserIndex(messages);
  return messages.map((m, i) =>
    i === idx
      ? {
          role: 'user',
          content: [
            { type: 'text', text: m.content },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        }
      : { role: m.role, content: m.content },
  );
}
/** Anthropic / zai multimodal: base64 image source. */
function anthropicMsgsWithImage(
  messages: AIMessage[],
  img: { mediaType: string; base64: string },
): unknown[] {
  const idx = lastUserIndex(messages);
  return messages.map((m, i) =>
    i === idx
      ? {
          role: 'user',
          content: [
            { type: 'text', text: m.content },
            { type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.base64 } },
          ],
        }
      : { role: m.role, content: m.content },
  );
}

export async function POST(req: Request) {
  let body: AIProxyRequest;
  try {
    body = (await req.json()) as AIProxyRequest;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { provider, apiKey, model, baseUrl, system, messages, image } = body || {};

  if (!provider || !DEFAULT_BASE_URLS[provider]) {
    return json({ error: `Unknown provider: ${String(provider)}` }, 400);
  }

  // CLI provider runs a local subscription CLI — needs no API key.
  if (provider === 'cli') {
    if (!Array.isArray(messages)) {
      return json({ error: 'messages must be an array' }, 400);
    }
    return handleCli(model, system, messages);
  }

  if (!apiKey || typeof apiKey !== 'string') {
    return json({ error: 'Missing API key. ตั้งค่า API key ในหน้าตั้งค่าก่อน' }, 400);
  }
  if (!model || typeof model !== 'string') {
    return json({ error: 'Missing model' }, 400);
  }
  if (!Array.isArray(messages)) {
    return json({ error: 'messages must be an array' }, 400);
  }

  const base = (baseUrl && baseUrl.trim()) || DEFAULT_BASE_URLS[provider];

  try {
    let url: string;
    let headers: Record<string, string>;
    let payload: unknown;

    const img = hasImage(image) ? parseDataUrl(image) : null;

    if (provider === 'openai') {
      url = `${base}/v1/chat/completions`;
      headers = {
        'content-type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      };
      const msgs = [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...(img ? openaiMsgsWithImage(messages, image as string) : messages),
      ];
      payload = { model, messages: msgs };
    } else if (provider === 'openrouter') {
      // OpenRouter is OpenAI-compatible. Its default base URL already ends in
      // `/v1`, so we append `/chat/completions` directly (no extra `/v1`).
      url = `${base}/chat/completions`;
      headers = {
        'content-type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Story AI',
      };
      const msgs = [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...(img ? openaiMsgsWithImage(messages, image as string) : messages),
      ];
      payload = { model, messages: msgs };
    } else if (provider === 'anthropic' || provider === 'zai') {
      url = `${base}/v1/messages`;
      headers = {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      };
      payload = {
        model,
        // ละครหลายตอน/ฉาก = JSON ยาว — 2048 เดิมทำให้ถูกตัด (ได้ไม่ครบตอน/ฉาก).
        // 8192 รองรับได้ถึง ~3 ตอน×5 ฉาก; โมเดล anthropic-compatible รองรับทั่วกัน.
        max_tokens: 8192,
        ...(system ? { system } : {}),
        messages: img ? anthropicMsgsWithImage(messages, img) : messages,
      };
    } else {
      // gemini
      url = `${base}/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;
      headers = { 'content-type': 'application/json' };
      const lastUser = lastUserIndex(messages);
      payload = {
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: messages.map((m, i) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts:
            img && i === lastUser
              ? [
                  { text: m.content },
                  { inline_data: { mime_type: img.mediaType, data: img.base64 } },
                ]
              : [{ text: m.content }],
        })),
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = extractProviderError(
        data,
        `Provider error (HTTP ${res.status})`
      );
      return json({ error: msg }, 502);
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
      return json({ error: 'AI ตอบกลับว่างเปล่า ลองอีกครั้ง' }, 502);
    }

    return json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'เชื่อมต่อผู้ให้บริการ AI ไม่สำเร็จ';
    return json({ error: msg }, 502);
  }
}
