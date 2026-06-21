// components/dashboard/angleMeta.ts
// Shared metadata for the "AI แนะนำ" dashboard: category styling + confidence tiers.

import type { BadgeColor } from '@/components/ui';

export const CATEGORIES = [
  'สำหรับคุณ',
  'เทรนด์วันนี้',
  'ให้ความรู้',
  'เทศกาล',
  'โลคัลสไตล์',
] as const;

export type Category = (typeof CATEGORIES)[number];

/** lucide icon names per category — kept as string keys; the component maps them. */
export const CATEGORY_ICON: Record<string, 'Sparkles' | 'TrendingUp' | 'GraduationCap' | 'PartyPopper' | 'MapPin'> = {
  สำหรับคุณ: 'Sparkles',
  เทรนด์วันนี้: 'TrendingUp',
  ให้ความรู้: 'GraduationCap',
  เทศกาล: 'PartyPopper',
  โลคัลสไตล์: 'MapPin',
};

/** Badge color per category, falling back to violet for unknown categories. */
export const CATEGORY_COLOR: Record<string, BadgeColor> = {
  สำหรับคุณ: 'violet',
  เทรนด์วันนี้: 'blue',
  ให้ความรู้: 'indigo',
  เทศกาล: 'amber',
  โลคัลสไตล์: 'emerald',
};

export function categoryColor(category: string): BadgeColor {
  return CATEGORY_COLOR[category] ?? 'violet';
}

export type ConfidenceTier = {
  label: string;
  color: BadgeColor;
};

/** Human-friendly confidence tier shown as a pill on each angle card. */
export function confidenceTier(value: number): ConfidenceTier {
  if (value >= 85) return { label: 'แนะนำสูงมาก', color: 'emerald' };
  if (value >= 70) return { label: 'แนะนำสูง', color: 'blue' };
  if (value >= 50) return { label: 'น่าลอง', color: 'amber' };
  return { label: 'ทางเลือก', color: 'slate' };
}
