'use client';

import type { ReactNode } from 'react';
import clsx from 'clsx';

export type FieldProps = {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  /** Optional leading icon for the label. */
  icon?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

/** A labeled form row used across the brand form. */
export function Field({
  label,
  htmlFor,
  hint,
  icon,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-700"
      >
        {icon && <span className="text-violet-500">{icon}</span>}
        {label}
        {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

const BASE_INPUT =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20';

export function TextField({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(BASE_INPUT, className)} {...rest} />;
}

export function TextAreaField({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={clsx(BASE_INPUT, 'resize-none', className)} {...rest} />
  );
}
