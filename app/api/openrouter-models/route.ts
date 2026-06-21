// app/api/openrouter-models/route.ts — Public OpenRouter model catalog proxy.
//
// GET /api/openrouter-models → trimmed list of OpenRouter models with pricing,
// used by the searchable <ModelPicker> on the settings page. No API key needed
// (the catalog endpoint is public). Cached for 1 hour.

export const runtime = 'nodejs';
export const revalidate = 3600;

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

type RawModel = {
  id?: string;
  name?: string;
  context_length?: number;
  description?: string;
  pricing?: { prompt?: string; completion?: string };
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function GET() {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { accept: 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return json(
        { error: `OpenRouter models error (HTTP ${res.status})` },
        502
      );
    }

    const data = (await res.json()) as { data?: RawModel[] };
    const raw = Array.isArray(data?.data) ? data.data : [];

    const models: OpenRouterModel[] = raw.map((m) => {
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

    return json(models);
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : 'ดึงรายการโมเดลจาก OpenRouter ไม่สำเร็จ';
    return json({ error: msg }, 502);
  }
}
