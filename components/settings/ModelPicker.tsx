'use client';

// components/settings/ModelPicker.tsx — universal, searchable model picker with
// inline pricing. Works for EVERY provider: it POSTs /api/models with the active
// provider + key + baseUrl, then lets the user filter by ฟรี / คุ้มราคา / ทั้งหมด,
// search by name/id, and pick a model.
//
// Gating: for key-required providers the parent passes `enabled` only once the
// connection test has succeeded, so we never spam the provider with bad keys.

import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { AlertCircle, Check, KeyRound, Search } from 'lucide-react';
import { Badge, Spinner } from '@/components/ui';
import type { Provider } from '@/lib/types';

// (static build) — the /api/models route was removed; the model list isn't fetched
// on the web build, so define the shape locally and let users type the model id.
export type ModelOption = {
  id: string;
  name: string;
  free: boolean;
  pricingKnown: boolean;
  promptPrice: number;
  completionPrice: number;
  context_length: number;
  approx?: boolean;
};

export type ModelPickerProps = {
  provider: Provider;
  apiKey: string;
  baseUrl?: string;
  /** Currently selected model id. */
  value: string;
  /** Called with the chosen model id when a row is clicked. */
  onChange: (id: string) => void;
  /** When false, don't fetch yet (e.g. key-required provider, not tested). */
  enabled: boolean;
  /** Bump to force a refetch (e.g. right after a successful connection test). */
  reloadToken?: number;
};

type FilterKey = 'all' | 'free' | 'value';

type LoadState =
  | { status: 'disabled' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; models: ModelOption[] };

/** Format a per-token USD price as "$/1M tokens" with 2-3 significant digits. */
function formatPrice(perToken: number): string {
  if (!Number.isFinite(perToken) || perToken < 0) return '—';
  if (perToken === 0) return 'ฟรี';
  const perMillion = perToken * 1e6;
  const digits = perMillion >= 100 ? 0 : perMillion >= 1 ? 2 : 3;
  // Trim only fractional trailing zeros (and a bare trailing dot) — never the
  // zeros of an integer (e.g. "$150" must stay "$150", not become "$15").
  const formatted = perMillion
    .toFixed(digits)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
  return `$${formatted}`;
}

/** "256000" → "ctx 256K"; "1048576" → "ctx 1.0M". */
function formatContext(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1_000_000) return `ctx ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `ctx ${Math.round(n / 1_000)}K`;
  return `ctx ${n}`;
}

export function ModelPicker({
  provider,
  apiKey,
  baseUrl,
  value,
  onChange,
  enabled,
  reloadToken = 0,
}: ModelPickerProps) {
  const [state, setState] = useState<LoadState>({ status: 'disabled' });
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  // Read the latest key at fetch time WITHOUT making it an effect dependency —
  // so typing the key char-by-char never triggers a fetch. Only provider /
  // baseUrl / enabled / reloadToken changes do.
  const apiKeyRef = useRef(apiKey);
  apiKeyRef.current = apiKey;

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'disabled' });
      return;
    }
    let alive = true;
    setState({ status: 'loading' });
    fetch('/api/models', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ provider, apiKey: apiKeyRef.current, baseUrl }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data)) {
          const msg =
            (data && typeof data.error === 'string' && data.error) ||
            `ดึงรายการโมเดลไม่สำเร็จ (HTTP ${res.status})`;
          throw new Error(msg);
        }
        return data as ModelOption[];
      })
      .then((models) => {
        if (alive) setState({ status: 'ready', models });
      })
      .catch((e: unknown) => {
        if (alive)
          setState({
            status: 'error',
            message: e instanceof Error ? e.message : 'ดึงรายการโมเดลไม่สำเร็จ',
          });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, baseUrl, enabled, reloadToken]);

  const models = state.status === 'ready' ? state.models : [];

  const counts = useMemo(() => {
    const free = models.filter((m) => m.free).length;
    const paid = models.filter((m) => m.pricingKnown && !m.free).length;
    return { all: models.length, free, value: paid };
  }, [models]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = models.filter((m) => {
      if (filter === 'free') return m.free;
      if (filter === 'value') return m.pricingKnown && !m.free;
      return true;
    });
    if (q) {
      list = list.filter(
        (m) =>
          m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
      );
    }
    const priceOf = (m: ModelOption) =>
      m.promptPrice < 0 ? Number.POSITIVE_INFINITY : m.promptPrice;
    if (filter === 'value') {
      list = [...list].sort((a, b) => priceOf(a) - priceOf(b));
    } else if (filter === 'all') {
      list = [...list].sort((a, b) => {
        if (a.free !== b.free) return a.free ? -1 : 1;
        if (a.pricingKnown !== b.pricingKnown) return a.pricingKnown ? -1 : 1;
        return priceOf(a) - priceOf(b);
      });
    }
    return list;
  }, [models, filter, query]);

  const pills: { key: FilterKey; label: string; count: number }[] = [
    { key: 'free', label: 'ฟรี', count: counts.free },
    { key: 'value', label: 'คุ้มราคา', count: counts.value },
    { key: 'all', label: 'ทั้งหมด', count: counts.all },
  ];

  // Disabled: key-required provider, not yet tested.
  if (state.status === 'disabled') {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p className="text-sm text-slate-500">
          ใส่ API Key แล้วกด{' '}
          <span className="font-medium text-slate-700">“ทดสอบการเชื่อมต่อ”</span>{' '}
          ระบบจะดึงรายการโมเดลที่ใช้ได้ของผู้ให้บริการนี้ขึ้นมาให้เลือกพร้อมราคา
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาโมเดล..."
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pl-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200 transition-colors"
        />
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        {pills.map((p) => {
          const active = filter === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setFilter(p.key)}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700'
              )}
            >
              {p.label}
              <span
                className={clsx(
                  'rounded-full px-1.5 text-[10px] font-semibold',
                  active ? 'bg-white/20 text-white' : 'bg-white text-slate-500'
                )}
              >
                {p.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List / states */}
      {state.status === 'loading' && (
        <div className="flex justify-center rounded-xl border border-slate-200 bg-slate-50 py-10">
          <Spinner label="กำลังโหลดรายการโมเดล…" />
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <p className="text-sm font-medium text-rose-800">
            {state.message} — ยังพิมพ์ชื่อโมเดลเองในช่องด้านล่างได้
          </p>
        </div>
      )}

      {state.status === 'ready' && (
        <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-200 bg-white">
          {visible.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">
              ไม่พบโมเดลที่ตรงกับการค้นหา
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visible.map((m) => {
                const selected = m.id === value;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => onChange(m.id)}
                      aria-pressed={selected}
                      className={clsx(
                        'flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors',
                        selected
                          ? 'bg-violet-50 ring-1 ring-inset ring-violet-300'
                          : 'hover:bg-slate-50'
                      )}
                    >
                      {/* Left: name + id + context */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {selected && (
                            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white">
                              <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            </span>
                          )}
                          <span className="truncate text-sm font-medium text-slate-900">
                            {m.name}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="truncate font-mono text-[11px] text-slate-400">
                            {m.id}
                          </span>
                          {formatContext(m.context_length) && (
                            <span className="shrink-0 text-[11px] text-slate-400">
                              {formatContext(m.context_length)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: pricing */}
                      <div className="shrink-0 text-right">
                        {m.free ? (
                          <Badge color="emerald" variant="soft">
                            ฟรี
                          </Badge>
                        ) : !m.pricingKnown ? (
                          <span className="text-[11px] text-slate-400">
                            ดูราคาที่เว็บผู้ให้บริการ
                          </span>
                        ) : (
                          <div className="leading-tight">
                            <div className="text-xs font-medium text-slate-700">
                              {m.approx && (
                                <span className="text-slate-400">≈ </span>
                              )}
                              {formatPrice(m.promptPrice)}{' '}
                              <span className="font-normal text-slate-400">
                                /1M (in)
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {formatPrice(m.completionPrice)}{' '}
                              <span className="text-slate-400">/1M (out)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {/* Approx-price disclaimer (curated providers). */}
          {models.some((m) => m.approx) && (
            <div className="border-t border-slate-100 px-3.5 py-2 text-[11px] text-slate-400">
              ราคาที่ขึ้นต้นด้วย ≈ เป็นราคาโดยประมาณจากเรทมาตรฐานของผู้ให้บริการ
              (API ไม่ได้คืนราคามาโดยตรง) — โปรดตรวจสอบราคาจริงที่เว็บผู้ให้บริการ
            </div>
          )}
        </div>
      )}
    </div>
  );
}
