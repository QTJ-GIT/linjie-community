import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Brand mark for 临介社区.
 *
 * The mark is a stylized glyph: two overlapping rounded squares forming a
 * chevron — suggests "conversation layers" and hints at the "介" radical
 * (两人相向) without literally drawing Chinese characters at favicon sizes.
 * Stroke uses a brand indigo→violet gradient.
 */

type LogoMarkProps = {
  size?: number;
  className?: string;
};

export function LogoMark({ size = 24, className }: LogoMarkProps) {
  const gid = React.useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`lm-${gid}`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(var(--brand-500))" />
          <stop offset="100%" stopColor="hsl(var(--brand-accent-500))" />
        </linearGradient>
      </defs>
      {/* filled rounded square backdrop */}
      <rect x="2" y="2" width="28" height="28" rx="8" fill={`url(#lm-${gid})`} />
      {/* chevron/layered strokes */}
      <path
        d="M9 12 L16 19 L23 12"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
      />
      <path
        d="M9 19 L16 26 L23 19"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
    </svg>
  );
}

export type LogoProps = {
  /** Show the full wordmark "临介社区" next to the mark */
  full?: boolean;
  /** Size of the mark in pixels */
  size?: number;
  className?: string;
};

export function Logo({ full = false, size = 28, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={size} />
      {full ? (
        <span className="flex flex-col leading-none">
          <span className="font-display text-base font-semibold tracking-tight">
            <span className="text-brand-gradient">临介</span>
            <span className="ml-0.5 text-foreground">社区</span>
          </span>
        </span>
      ) : null}
    </span>
  );
}
