import clsx from 'clsx';

export type ConfidenceBarProps = {
  /** 0-100. */
  value: number;
  /** Label shown on the left. Default "ความมั่นใจของ AI". */
  label?: string;
  /** Hide the numeric % on the right. */
  hidePercent?: boolean;
  className?: string;
};

export function ConfidenceBar({
  value,
  label = 'ความมั่นใจของ AI',
  hidePercent = false,
  className,
}: ConfidenceBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={clsx('w-full', className)}>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        {!hidePercent && (
          <span className="font-semibold text-slate-700">{pct}%</span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-600 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
