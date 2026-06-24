// lib/types.ts — Shared TypeScript types for Story AI (storyallday)
// This file is the source of truth for all data shapes used across the app.

/** AI provider the proxy can call. `cli` runs a local subscription CLI. */
export type Provider = 'openai' | 'anthropic' | 'gemini' | 'zai' | 'openrouter';

// --- Membership / access control --------------------------------------------

/** Role of a signed-in account. Admins manage members' access time. */
export type Role = 'admin' | 'member';

/** Subscription plan id. */
export type PlanId = 'monthly' | 'yearly';

/** Admin-controlled subscription status. (Absence of membership = not activated.) */
export type MembershipStatus = 'active' | 'suspended';

/**
 * A member's subscription window. Set ONLY by an admin (Firestore rules forbid
 * members from writing this on their own doc). `null` start/expires = open-ended
 * (rare; admin normally sets both).
 */
export type Membership = {
  plan: PlanId | null;
  status: MembershipStatus;
  /** ISO date — access begins. */
  startAt: string | null;
  /** ISO date — access ends (inclusive day). */
  expiresAt: string | null;
  /** Free-text admin note. */
  note?: string;
  /** ISO timestamp of the last admin change. */
  updatedAt?: string;
  /** Email of the admin who last changed it. */
  updatedBy?: string;
};

/** A user row as seen by the admin member-management screen. */
export type MemberProfile = {
  uid: string;
  email: string;
  role: Role;
  membership: Membership | null;
  /** ISO timestamp of account creation. */
  createdAt: string;
};

/** Per-provider connection config — each provider keeps its OWN key/model/baseUrl. */
export type ProviderConfig = {
  apiKey: string;
  model: string;
  /** Optional override for the provider base URL (proxy/self-host/gateway). */
  baseUrl?: string;
};

/**
 * Configurable AI connection settings (stored in the zustand store).
 *
 * `apiKey/model/baseUrl` MIRROR the currently-active provider's config so every
 * existing call site (`settings.apiKey`, etc.) keeps working unchanged.
 * `keys` is the real per-provider source of truth — switching providers no
 * longer overwrites another provider's key. Always keyed by every Provider.
 */
export type AISettings = {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  keys: Record<Provider, ProviderConfig>;
  /**
   * Opt-in: sync the per-provider API keys to the signed-in user's Firestore doc
   * (`users/{uid}.aiSettings`) so they follow the account across devices. Default
   * OFF = keys stay device-local (safer — never leave the device). Per device.
   */
  syncKeys?: boolean;
};

/** Built-in default model id per provider (used to seed empty configs). */
export const DEFAULT_MODEL: Record<Provider, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
  gemini: 'gemini-2.0-flash',
  zai: 'glm-4.6',
  openrouter: 'cohere/north-mini-code:free',
};

/** Every provider id, in display order. */
export const ALL_PROVIDERS: Provider[] = [
  'openai',
  'anthropic',
  'gemini',
  'zai',
  'openrouter',
];

/** The page owner's brand profile — feeds prompts. */
export type Brand = {
  name: string;
  business: string;
  tone: string;
  language: string;
  audience: string;
  keywords: string[];
};

/** Social platforms a post can target. */
export type Platform = 'facebook' | 'instagram' | 'line';

/** Lifecycle status of a post. */
export type PostStatus = 'pending' | 'scheduled' | 'published' | 'draft';

/** An AI-suggested content angle / idea. */
export type Angle = {
  id: string;
  title: string;
  /** UI category, e.g. "สำหรับคุณ" | "เทรนด์วันนี้" | "ให้ความรู้" | "เทศกาล" | "โลคัลสไตล์" */
  category: string;
  /** Confidence score 0-100. */
  confidence: number;
  /** Why the AI thinks this angle works. */
  rationale: string;
  /** Suggested format, e.g. "ภาพเดี่ยว", "คารูเซล", "วิดีโอสั้น". */
  format: string;
  /** ISO timestamp. */
  createdAt: string;
};

/** A concrete post (draft / scheduled / published). */
export type Post = {
  id: string;
  title: string;
  caption: string;
  hashtags: string[];
  platforms: Platform[];
  status: PostStatus;
  /** ISO timestamp — present when scheduled/published. */
  scheduledAt?: string;
  /** ISO timestamp — when the post record was created. */
  createdAt: string;
  /** Source angle id, if generated from one. */
  angleId?: string;
  /** Short description of the suggested image. */
  imageIdea?: string;
};

/** A single chat message passed to the AI proxy. */
export type AIMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

/** Request body for POST /api/ai. */
export type AIProxyRequest = {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  system?: string;
  messages: AIMessage[];
  /** Optional image (data URL) attached to the last user message — vision. */
  image?: string;
};

/** Normalized response from POST /api/ai. */
export type AIProxyResponse = { text: string } | { error: string };
