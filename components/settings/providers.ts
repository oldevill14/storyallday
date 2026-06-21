// components/settings/providers.ts — Provider metadata for the AI settings page.

import type { Provider } from '@/lib/types';

export type ProviderMeta = {
  id: Provider;
  /** Display label in Thai/Latin. */
  label: string;
  /** Short Thai tagline shown under the label. */
  tagline: string;
  /** Default model id for this provider. */
  defaultModel: string;
  /** A few suggested models the user can pick from quickly. */
  models: string[];
  /** Default base URL hint (placeholder), if any. */
  baseUrlPlaceholder: string;
  /** Where to get an API key. */
  keyUrl: string;
  /** Accent color for the provider chip (matches UI kit palette). */
  accent: 'emerald' | 'violet' | 'blue' | 'indigo';
};

/** Ordered list of supported providers with their defaults. */
export const PROVIDERS: ProviderMeta[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    tagline: 'GPT-4o · ChatGPT',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
    baseUrlPlaceholder: 'https://api.openai.com',
    keyUrl: 'https://platform.openai.com/api-keys',
    accent: 'emerald',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    tagline: 'Claude',
    defaultModel: 'claude-3-5-haiku-latest',
    models: [
      'claude-3-5-haiku-latest',
      'claude-3-5-sonnet-latest',
      'claude-3-7-sonnet-latest',
    ],
    baseUrlPlaceholder: 'https://api.anthropic.com',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    accent: 'violet',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    tagline: 'Google AI',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro'],
    baseUrlPlaceholder: '— ไม่ต้องกรอก —',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    accent: 'blue',
  },
  {
    id: 'zai',
    label: 'GLM (z.ai)',
    tagline: 'Zhipu GLM',
    defaultModel: 'glm-4.6',
    models: ['glm-4.6', 'glm-4.5', 'glm-4.5-air'],
    baseUrlPlaceholder: 'https://api.z.ai/api/anthropic',
    keyUrl: 'https://z.ai/manage-apikey/apikey-list',
    accent: 'indigo',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    tagline: '100+ โมเดล · ฟรี/คุ้มราคา',
    defaultModel: 'cohere/north-mini-code:free',
    models: [
      'cohere/north-mini-code:free',
      'anthropic/claude-3.5-haiku',
      'google/gemini-2.0-flash-001',
      'openai/gpt-4o-mini',
    ],
    baseUrlPlaceholder: 'https://openrouter.ai/api/v1',
    keyUrl: 'https://openrouter.ai/keys',
    accent: 'violet',
  },
  {
    id: 'cli',
    label: 'CLI ในเครื่อง',
    tagline: 'ใช้ subscription · ไม่เปลือง API',
    defaultModel: 'claude',
    models: ['claude', 'codex', 'ollama:llama3.1'],
    baseUrlPlaceholder: '— ไม่ต้องกรอก —',
    keyUrl: '#',
    accent: 'emerald',
  },
];

/** Look up provider metadata by id (falls back to the first entry). */
export function getProviderMeta(id: Provider): ProviderMeta {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0];
}

/** Default model id for a given provider. */
export function defaultModelFor(id: Provider): string {
  return getProviderMeta(id).defaultModel;
}
