'use client';

import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { X, Plus, Hash } from 'lucide-react';

export type KeywordInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Soft cap; once reached the input is disabled. */
  max?: number;
};

/**
 * A tag-style input for editing Brand.keywords[].
 * - Type a keyword and press Enter or "," to add it.
 * - Backspace on an empty field removes the last tag.
 * - Click the × on a chip to remove it.
 */
export function KeywordInput({
  value,
  onChange,
  placeholder = 'พิมพ์คีย์เวิร์ดแล้วกด Enter…',
  max = 12,
}: KeywordInputProps) {
  const [draft, setDraft] = useState('');
  const atCap = value.length >= max;

  function addKeyword(raw: string) {
    const cleaned = raw.trim().replace(/^#+/, '').trim();
    if (!cleaned) return;
    if (atCap) return;
    // case-insensitive de-dupe
    const exists = value.some(
      (k) => k.toLowerCase() === cleaned.toLowerCase()
    );
    if (exists) {
      setDraft('');
      return;
    }
    onChange([...value, cleaned]);
    setDraft('');
  }

  function removeAt(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      e.preventDefault();
      removeAt(value.length - 1);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/20">
        {value.map((kw, idx) => (
          <span
            key={`${kw}-${idx}`}
            className="inline-flex items-center gap-1 rounded-full bg-violet-50 py-1 pl-2.5 pr-1.5 text-sm font-medium text-violet-700"
          >
            <Hash className="h-3 w-3 text-violet-400" />
            {kw}
            <button
              type="button"
              onClick={() => removeAt(idx)}
              aria-label={`ลบคีย์เวิร์ด ${kw}`}
              className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-violet-500 transition-colors hover:bg-violet-200 hover:text-violet-800"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addKeyword(draft)}
          disabled={atCap}
          placeholder={atCap ? `ครบ ${max} คำแล้ว` : placeholder}
          className="h-7 min-w-[8rem] flex-1 bg-transparent px-1 text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />

        {draft.trim() && !atCap && (
          <button
            type="button"
            onClick={() => addKeyword(draft)}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-violet-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-violet-700"
          >
            <Plus className="h-3 w-3" />
            เพิ่ม
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400">
        คีย์เวิร์ดช่วยให้ AI เลือกมุมและคำที่ตรงกับธุรกิจของคุณ ({value.length}/{max})
      </p>
    </div>
  );
}
