import clsx from 'clsx';
import { Bot } from 'lucide-react';

export type MascotProps = {
  /** Pixel size of the circle. Default 40. */
  size?: number;
  className?: string;
};

/** The friendly Story AI robot mascot: a gradient circle with a Bot icon. */
export function Mascot({ size = 40, className }: MascotProps) {
  return (
    <div
      className={clsx(
        'flex items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-sm shadow-violet-500/30',
        className
      )}
      style={{ width: size, height: size }}
    >
      <Bot style={{ width: size * 0.55, height: size * 0.55 }} />
    </div>
  );
}
