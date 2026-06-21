'use client';

import {
  Sparkles,
  TrendingUp,
  GraduationCap,
  PartyPopper,
  MapPin,
  Lightbulb,
  LayoutTemplate,
  Wand2,
  Eye,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { Angle } from '@/lib/types';
import { Card, Badge, Button, ConfidenceBar } from '@/components/ui';
import { categoryColor, confidenceTier } from './angleMeta';

const CATEGORY_ICONS: Record<string, ComponentType<LucideProps>> = {
  สำหรับคุณ: Sparkles,
  เทรนด์วันนี้: TrendingUp,
  ให้ความรู้: GraduationCap,
  เทศกาล: PartyPopper,
  โลคัลสไตล์: MapPin,
};

export type AngleCardProps = {
  angle: Angle;
  /** True while this card's "ใช้มุมนี้" action is generating a draft. */
  using?: boolean;
  /** Disable actions (e.g. another card is busy, or no API key). */
  disabled?: boolean;
  onUse: (angle: Angle) => void;
  onPreview: (angle: Angle) => void;
};

/** A single AI-suggested content angle card. */
export function AngleCard({ angle, using = false, disabled = false, onUse, onPreview }: AngleCardProps) {
  const CatIcon = CATEGORY_ICONS[angle.category] ?? Sparkles;
  const tier = confidenceTier(angle.confidence);

  return (
    <Card hoverable className="flex h-full flex-col gap-3">
      {/* Header: category chip + confidence tier */}
      <div className="flex items-center justify-between gap-2">
        <Badge color={categoryColor(angle.category)} icon={<CatIcon className="h-3.5 w-3.5" />}>
          {angle.category}
        </Badge>
        <Badge color={tier.color} variant="outline">
          {tier.label}
        </Badge>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold leading-snug text-slate-900">{angle.title}</h3>

      {/* Confidence */}
      <ConfidenceBar value={angle.confidence} />

      {/* Rationale */}
      <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-slate-400">แนวทาง / เหตุผล</div>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{angle.rationale}</p>
        </div>
      </div>

      {/* Format */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <LayoutTemplate className="h-4 w-4 shrink-0 text-violet-500" />
        <span className="text-slate-400">รูปแบบที่แนะนำ:</span>
        <span className="font-medium text-slate-700">{angle.format}</span>
      </div>

      {/* Actions */}
      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button
          className="flex-1"
          loading={using}
          disabled={disabled}
          icon={<Wand2 className="h-4 w-4" />}
          onClick={() => onUse(angle)}
        >
          ใช้มุมนี้
        </Button>
        <Button
          variant="outline"
          disabled={disabled || using}
          icon={<Eye className="h-4 w-4" />}
          onClick={() => onPreview(angle)}
        >
          ดูตัวอย่าง
        </Button>
      </div>
    </Card>
  );
}
