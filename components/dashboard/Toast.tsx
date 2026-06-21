'use client';

import { useEffect } from 'react';
import clsx from 'clsx';
import { CheckCircle2, X } from 'lucide-react';

export type ToastData = {
  message: string;
  tone?: 'success' | 'error';
};

export type ToastProps = {
  toast: ToastData | null;
  onClose: () => void;
  /** Auto-dismiss after N ms. Default 3500. */
  duration?: number;
};

/** A small toast notification pinned to the bottom-center of the viewport. */
export function Toast({ toast, onClose, duration = 3500 }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [toast, duration, onClose]);

  if (!toast) return null;

  const isError = toast.tone === 'error';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div
        role="status"
        className={clsx(
          'pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg',
          isError
            ? 'border-rose-200 bg-white text-rose-700'
            : 'border-emerald-200 bg-white text-slate-800'
        )}
      >
        <span
          className={clsx(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center',
            isError ? 'text-rose-500' : 'text-emerald-500'
          )}
        >
          {isError ? <X className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
        </span>
        <p className="text-sm leading-relaxed">{toast.message}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="ml-1 shrink-0 rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
