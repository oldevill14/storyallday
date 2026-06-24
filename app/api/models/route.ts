// app/api/models/route.ts — universal model-catalog proxy (per provider).
//
// POST { provider, apiKey?, baseUrl? } → ModelOption[]
//
// Fetches the LIVE model list from the selected provider using the user's key,
// and attaches pricing:
//   • openrouter → exact prices from its public catalog
//   • openai / anthropic / gemini → live ids + curated approximate prices
//   • zai → curated id list + curated prices (no reliable public list endpoint)
//
// Called server-side to avoid CORS and to keep the key off third-party-visible
// client logs. Mirrors the provider/base-url conventions of /api/ai.

import type { Provider } from '@/lib/types';
import { curatedPrice, CURATED_MODELS } from '@/lib/pricing';

export const runtime = 'nodejs';

/** A single model row as consumed by the <ModelPicker>. */
export type ModelOption = {
  id: string;
  name: string;
  context_length: number;
  /** USD per token (input). -1 = unknown/variable. */
  promptPrice: number;
  /** USD per token (output). -1 = unknown/variable. */
  completionPrice: number;
  free: boolean;
  /** false → price unknown from any source (show "ดูราคาที่เว็บ"). */
  pricingKnown: boolean;
  /** true → curated approximate list price (not from the provider's API). */
  approx: boolean;
  description?: string;
};

const DEFAULT_BASE_URLS: Record<Provider, string> = {
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  zai: 'https://api.z.ai/api/anthropic',
  gemini: 'https://generativelanguage.googleapis.com',
  openrouter: 'https://openrouter.ai/api/v1',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function providerError(payload: unknown, fallback: string): string {
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

/** Build a curated/approx-priced option for a known provider model id. */
function withCuratedPrice(
  provider: Provider,
  id: string,
  name: string,
  context_length: number,
  description?: string
): ModelOption {
  const price = curatedPrice(provider, id);
  if (price) {
    return {
      id,
      name,
      context_length,
      promptPrice: price.promptPrice,
      completionPrice: price.completionPrice,
      free: price.free,
      pricingKnown: true,
      approx: true,
      description,
    };
  }
  return {
    id,
    name,
    context_length,
    promptPrice: -1,
    completionPrice: -1,
    free: false,
    pricingKnown: false,
    approx: false,
    description,
  };
}

// --- Per-provider fetchers ---------------------------------------------------

async function fetchOpenRouter(): Promise<ModelOption[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { accept: 'application/json' },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`OpenRouter models error (HTTP ${res.status})`);
  const data = (await res.json()) as {
    data?: Array<{
      id?: string;
      name?: string;
      context_length?: number;
      description?: string;
      pricing?: { prompt?: string; completion?: string };
    }>;
  };
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
      pricingKnown: true,
      approx: false,
      description: String(m.description ?? ''),
    } satisfies ModelOption;
  });
}

/** Exclude obvious non-chat endpoints from OpenAI's flat model list. */
const OPENAI_NON_CHAT =
  /(embedding|whisper|tts|audio|dall-e|moderation|image|realtime|transcribe|search|babbage|davinci|codex|computer-use)/i;

async function fetchOpenAI(base: string, apiKey: string): Promise<ModelOption[]> {
  if (!apiKey) throw new Error('ต้องใส่ API Key ก่อนจึงจะดึงรายการโมเดลได้');
  const res = await fetch(`${base}/v1/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(providerError(data, `OpenAI models error (HTTP ${res.status})`));
  const list = Array.isArray((data as { data?: unknown[] })?.data)
    ? ((data as { data: Array<{ id?: string }> }).data)
    : [];
  return list
    .map((m) => String(m.id ?? ''))
    .filter((id) => id && !OPENAI_NON_CHAT.test(id))
    .filter((id) => /^(gpt-|o\d|chatgpt)/i.test(id))
    .sort()
    .map((id) => withCuratedPrice('openai', id, id, 0));
}

async function fetchAnthropic(base: string, apiKey: string): Promise<ModelOption[]> {
  if (!apiKey) throw new Error('ต้องใส่ API Key ก่อนจึงจะดึงรายการโมเดลได้');
  const res = await fetch(`${base}/v1/models?limit=1000`, {
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(
      providerError(data, `Anthropic models error (HTTP ${res.status})`)
    );
  const list = Array.isArray((data as { data?: unknown[] })?.data)
    ? ((data as { data: Array<{ id?: string; display_name?: string }> }).data)
    : [];
  return list
    .map((m) => ({ id: String(m.id ?? ''), name: String(m.display_name ?? m.id ?? '') }))
    .filter((m) => m.id)
    .map((m) => withCuratedPrice('anthropic', m.id, m.name, 0));
}

async function fetchGemini(base: string, apiKey: string): Promise<ModelOption[]> {
  if (!apiKey) throw new Error('ต้องใส่ API Key ก่อนจึงจะดึงรายการโมเดลได้');
  const res = await fetch(
    `${base}/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=1000`
  );
  const data = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(providerError(data, `Gemini models error (HTTP ${res.status})`));
  const list = Array.isArray((data as { models?: unknown[] })?.models)
    ? ((data as {
        models: Array<{
          name?: string;
          displayName?: string;
          supportedGenerationMethods?: string[];
          inputTokenLimit?: number;
        }>;
      }).models)
    : [];
  return list
    .filter((m) =>
      (m.supportedGenerationMethods ?? []).includes('generateContent')
    )
    .map((m) => {
      const id = String(m.name ?? '').replace(/^models\//, '');
      return withCuratedPrice(
        'gemini',
        id,
        String(m.displayName ?? id),
        Number(m.inputTokenLimit ?? 0)
      );
    })
    .filter((m) => m.id);
}

function fetchZaiCurated(): ModelOption[] {
  const ids = CURATED_MODELS.zai ?? [];
  return ids.map((id) => withCuratedPrice('zai', id, id, 128000));
}

// --- Handler -----------------------------------------------------------------

export async function POST(req: Request) {
  let body: { provider?: Provider; apiKey?: string; baseUrl?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const provider = body.provider;
  const apiKey = (body.apiKey ?? '').trim();
  if (!provider || !DEFAULT_BASE_URLS[provider]) {
    return json({ error: `Unknown provider: ${String(provider)}` }, 400);
  }
  const base = (body.baseUrl ?? '').trim() || DEFAULT_BASE_URLS[provider];

  try {
    let models: ModelOption[];
    if (provider === 'openrouter') models = await fetchOpenRouter();
    else if (provider === 'openai') models = await fetchOpenAI(base, apiKey);
    else if (provider === 'anthropic') models = await fetchAnthropic(base, apiKey);
    else if (provider === 'gemini') models = await fetchGemini(base, apiKey);
    else models = fetchZaiCurated(); // zai
    return json(models);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'ดึงรายการโมเดลไม่สำเร็จ';
    return json({ error: msg }, 502);
  }
}
