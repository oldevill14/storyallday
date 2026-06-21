import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export type SpinnerProps = {
  /** Pixel size. Default 20. */
  size?: number;
  className?: string;
  /** Optional label rendered next to the spinner. */
  label?: string;
};

export function Spinner({ size = 20, className, label }: SpinnerProps) {
  return (
    <span className={clsx('inline-flex items-center gap-2 text-slate-500', className)}>
      <Loader2 className="animate-spin text-violet-600" style={{ width: size, height: size }} />
      {label && <span className="text-sm">{label}</span>}
    </span>
  );
}
