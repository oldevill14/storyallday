// lib/types.ts — Shared TypeScript types for Story AI (storyallday)
// This file is the source of truth for all data shapes used across the app.

/** AI provider the proxy can call. */
export type Provider = 'openai' | 'anthropic' | 'gemini' | 'zai' | 'openrouter';

/** Configurable AI connection settings (stored in the zustand store). */
export type AISettings = {
  provider: Provider;
  apiKey: string;
  model: string;
  /** Optional override for the provider base URL (proxy/self-host/gateway). */
  baseUrl?: string;
};

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
};

/** Normalized response from POST /api/ai. */
export type AIProxyResponse = { text: string } | { error: string };
