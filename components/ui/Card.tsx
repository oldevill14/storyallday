import type { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  /** Adds inner padding (p-5). Default true. */
  padded?: boolean;
  /** Slightly stronger hover affordance for clickable cards. */
  hoverable?: boolean;
  children?: ReactNode;
};

export function Card({
  padded = true,
  hoverable = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl bg-white border border-slate-200 shadow-sm shadow-slate-200/50',
        padded && 'p-5',
        hoverable && 'transition-shadow hover:shadow-md hover:border-slate-300',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
