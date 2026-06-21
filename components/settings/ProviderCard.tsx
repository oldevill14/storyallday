'use client';

import clsx from 'clsx';
import { Check } from 'lucide-react';
import type { ProviderMeta } from './providers';

export type ProviderCardProps = {
  meta: ProviderMeta;
  selected: boolean;
  onSelect: () => void;
};

const ACCENT_RING: Record<ProviderMeta['accent'], string> = {
  emerald: 'border-emerald-400 ring-2 ring-emerald-200 bg-emerald-50/40',
  violet: 'border-violet-400 ring-2 ring-violet-200 bg-violet-50/40',
  blue: 'border-blue-400 ring-2 ring-blue-200 bg-blue-50/40',
  indigo: 'border-indigo-400 ring-2 ring-indigo-200 bg-indigo-50/40',
};

const ACCENT_DOT: Record<ProviderMeta['accent'], string> = {
  emerald: 'bg-emerald-500',
  violet: 'bg-violet-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
};

const ACCENT_CHECK: Record<ProviderMeta['accent'], string> = {
  emerald: 'bg-emerald-500',
  violet: 'bg-violet-600',
  blue: 'bg-blue-600',
  indigo: 'bg-indigo-600',
};

/** A selectable provider tile (radio-card) used in the AI settings page. */
export function ProviderCard({ meta, selected, onSelect }: ProviderCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={clsx(
        'relative flex w-full flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40',
        selected
          ? ACCENT_RING[meta.accent]
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      )}
    >
      {selected && (
        <span
          className={clsx(
            'absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-white',
            ACCENT_CHECK[meta.accent]
          )}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
      <div className="flex items-center gap-2">
        <span className={clsx('h-2.5 w-2.5 rounded-full', ACCENT_DOT[meta.accent])} />
        <span className="text-sm font-semibold text-slate-900">{meta.label}</span>
      </div>
      <span className="text-xs text-slate-500">{meta.tagline}</span>
      <span className="mt-1 truncate text-[11px] font-medium text-slate-400">
        ค่าเริ่มต้น: {meta.defaultModel}
      </span>
    </button>
  );
}
