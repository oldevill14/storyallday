import clsx from 'clsx';
import type { Platform } from '@/lib/types';

// lucide-react 1.x doesn't ship facebook/instagram brand marks, so we use
// small inline SVG brand glyphs styled with each platform's brand color.
// Rendered as little colored circles to match the reference screenshots.

type PlatformMeta = {
  label: string;
  bg: string;
  glyph: React.ReactNode;
};

const FacebookGlyph = (
  <path
    fill="currentColor"
    d="M13.5 21v-7h2.3l.35-2.7H13.5V9.6c0-.78.22-1.31 1.34-1.31h1.43V5.87A19 19 0 0 0 14.18 5.75c-2.07 0-3.48 1.26-3.48 3.58v2h-2.34V14h2.34v7z"
  />
);

const InstagramGlyph = (
  <>
    <rect x="6" y="6" width="12" height="12" rx="3.5" ry="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="15.6" cy="8.4" r="0.9" fill="currentColor" />
  </>
);

const LineGlyph = (
  <path
    fill="currentColor"
    d="M12 5.5c-3.87 0-7 2.5-7 5.58 0 2.76 2.49 5.07 5.85 5.51.23.05.54.15.62.35.07.18.05.46.02.64l-.1.6c-.03.18-.14.7.62.38s4.08-2.4 5.57-4.12c1.03-1.13 1.42-2.27 1.42-3.96C19.0 8 15.87 5.5 12 5.5"
  />
);

const PLATFORMS: Record<Platform, PlatformMeta> = {
  facebook: { label: 'Facebook', bg: 'bg-[#1877F2]', glyph: FacebookGlyph },
  instagram: {
    label: 'Instagram',
    // Instagram brand gradient.
    bg: 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    glyph: InstagramGlyph,
  },
  line: { label: 'LINE', bg: 'bg-[#06C755]', glyph: LineGlyph },
};

export type PlatformIconProps = {
  platform: Platform;
  /** Pixel size of the circle. Default 18. */
  size?: number;
  className?: string;
};

/** A single platform glyph rendered as a colored circle. */
export function PlatformIcon({ platform, size = 18, className }: PlatformIconProps) {
  const meta = PLATFORMS[platform];
  return (
    <span
      title={meta.label}
      aria-label={meta.label}
      className={clsx(
        'inline-flex items-center justify-center rounded-full text-white',
        meta.bg,
        className
      )}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        style={{ width: size * 0.7, height: size * 0.7 }}
        aria-hidden="true"
      >
        {meta.glyph}
      </svg>
    </span>
  );
}

export type PlatformIconsProps = {
  platforms: Platform[];
  size?: number;
  className?: string;
};

/** A row of platform glyphs. */
export function PlatformIcons({ platforms, size = 18, className }: PlatformIconsProps) {
  return (
    <span className={clsx('inline-flex items-center gap-1', className)}>
      {platforms.map((p) => (
        <PlatformIcon key={p} platform={p} size={size} />
      ))}
    </span>
  );
}
