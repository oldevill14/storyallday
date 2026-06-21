// lib/pricing.ts — curated, APPROXIMATE public list prices for provider models.
//
// Why this exists: the model-list APIs of OpenAI / Anthropic / Gemini / z.ai do
// NOT return pricing (only OpenRouter's catalog does). So when we fetch the live
// model list from those providers, we attach known list prices from this table.
// Values are USD per 1,000,000 tokens (input / output). Treat as approximate —
// providers change prices and tiers; the UI labels these "โดยประมาณ".

import type { Provider } from './types';

type PriceRow = { in: number; out: number };

// Keyed by an id PREFIX; the longest prefix that the model id starts with wins.
// (Order doesn't matter — matching picks the longest key.)
const TABLE: Record<Exclude<Provider, 'openrouter' | 'cli'>, Record<string, PriceRow>> = {
  openai: {
    'gpt-4o-mini': { in: 0.15, out: 0.6 },
    'gpt-4o': { in: 2.5, out: 10 },
    'gpt-4.1-nano': { in: 0.1, out: 0.4 },
    'gpt-4.1-mini': { in: 0.4, out: 1.6 },
    'gpt-4.1': { in: 2, out: 8 },
    'gpt-4-turbo': { in: 10, out: 30 },
    'gpt-3.5-turbo': { in: 0.5, out: 1.5 },
    'o4-mini': { in: 1.1, out: 4.4 },
    'o3-mini': { in: 1.1, out: 4.4 },
    'o3': { in: 2, out: 8 },
    'o1-mini': { in: 1.1, out: 4.4 },
    'o1': { in: 15, out: 60 },
  },
  anthropic: {
    'claude-3-5-haiku': { in: 0.8, out: 4 },
    'claude-3-haiku': { in: 0.25, out: 1.25 },
    'claude-3-5-sonnet': { in: 3, out: 15 },
    'claude-3-7-sonnet': { in: 3, out: 15 },
    'claude-sonnet-4': { in: 3, out: 15 },
    'claude-3-opus': { in: 15, out: 75 },
    'claude-opus-4': { in: 15, out: 75 },
  },
  gemini: {
    'gemini-2.0-flash-lite': { in: 0.075, out: 0.3 },
    'gemini-2.0-flash': { in: 0.1, out: 0.4 },
    'gemini-1.5-flash-8b': { in: 0.0375, out: 0.15 },
    'gemini-1.5-flash': { in: 0.075, out: 0.3 },
    'gemini-1.5-pro': { in: 1.25, out: 5 },
    'gemini-2.5-flash-lite': { in: 0.1, out: 0.4 },
    'gemini-2.5-flash': { in: 0.3, out: 2.5 },
    'gemini-2.5-pro': { in: 1.25, out: 10 },
  },
  zai: {
    'glm-4.6': { in: 0.6, out: 2.2 },
    'glm-4.5-airx': { in: 0.1, out: 0.6 },
    'glm-4.5-air': { in: 0.2, out: 1.1 },
    'glm-4.5-x': { in: 1.2, out: 4.5 },
    'glm-4.5-flash': { in: 0, out: 0 },
    'glm-4.5': { in: 0.6, out: 2.2 },
    'glm-4-32b': { in: 0.1, out: 0.1 },
  },
};

export type CuratedPrice = {
  /** USD per token (input). */
  promptPrice: number;
  /** USD per token (output). */
  completionPrice: number;
  free: boolean;
};

/**
 * Curated price (USD per token) for a provider model id, or null if unknown.
 * OpenRouter is excluded — its prices come from the live catalog instead.
 */
export function curatedPrice(provider: Provider, id: string): CuratedPrice | null {
  if (provider === 'openrouter' || provider === 'cli') return null;
  const table = TABLE[provider];
  if (!table) return null;
  const lid = id.toLowerCase();

  let bestKey = '';
  for (const key of Object.keys(table)) {
    if (lid.startsWith(key) && key.length > bestKey.length) bestKey = key;
  }
  // Looser fallback: substring match (e.g. dated ids like "...-20241022").
  if (!bestKey) {
    for (const key of Object.keys(table)) {
      if (lid.includes(key) && key.length > bestKey.length) bestKey = key;
    }
  }
  if (!bestKey) return null;

  const row = table[bestKey];
  return {
    promptPrice: row.in / 1e6,
    completionPrice: row.out / 1e6,
    free: row.in === 0 && row.out === 0,
  };
}

/**
 * Curated model-id list for providers without a reliable public list endpoint
 * we can hit from the proxy. (z.ai's anthropic-compatible base doesn't expose a
 * usable /models list, so we ship a known-good set.)
 */
export const CURATED_MODELS: Partial<Record<Provider, string[]>> = {
  zai: [
    'glm-4.6',
    'glm-4.5',
    'glm-4.5-air',
    'glm-4.5-airx',
    'glm-4.5-x',
    'glm-4.5-flash',
  ],
};
