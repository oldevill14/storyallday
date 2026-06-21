'use client';

import clsx from 'clsx';
import {
  Layers,
  Sparkles,
  TrendingUp,
  GraduationCap,
  PartyPopper,
  MapPin,
  type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { CATEGORIES } from './angleMeta';

const ICONS: Record<string, ComponentType<LucideProps>> = {
  สำหรับคุณ: Sparkles,
  เทรนด์วันนี้: TrendingUp,
  ให้ความรู้: GraduationCap,
  เทศกาล: PartyPopper,
  โลคัลสไตล์: MapPin,
};

export type CategoryFilterProps = {
  /** null = "ทั้งหมด". */
  active: string | null;
  onChange: (value: string | null) => void;
  /** Count of angles per category (key) for the badge. `__all__` = total. */
  counts: Record<string, number>;
};

function Chip({
  label,
  count,
  active,
  Icon,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  Icon: ComponentType<LucideProps>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-sm shadow-violet-600/20'
          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <span
        className={clsx(
          'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-semibold',
          active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
        )}
      >
        {count}
      </span>
    </button>
  );
}

/** Horizontal scrollable row of category filter chips with counts. */
export function CategoryFilter({ active, onChange, counts }: CategoryFilterProps) {
  return (
    <div className="-mx-1 flex flex-wrap gap-2 px-1">
      <Chip
        label="ทั้งหมด"
        Icon={Layers}
        count={counts.__all__ ?? 0}
        active={active === null}
        onClick={() => onChange(null)}
      />
      {CATEGORIES.map((cat) => (
        <Chip
          key={cat}
          label={cat}
          Icon={ICONS[cat] ?? Sparkles}
          count={counts[cat] ?? 0}
          active={active === cat}
          onClick={() => onChange(cat)}
        />
      ))}
    </div>
  );
}
