'use client';

import { cn } from '@/lib/utils';
import type { ReactNode, CSSProperties } from 'react';

export interface GradientTextProps {
  children: ReactNode;
  className?: string;
  /** Tailwind from/via/to gradient classes (overrides default brand gradient) */
  gradientClassName?: string;
  /** Animate background-position to flow */
  animate?: boolean;
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'div' | 'p';
}

/**
 * GradientText —— bg-clip-text + transparent text。
 * 默认使用品牌渐变，也可以通过 gradientClassName 覆盖。
 *
 * 注意：当 animate=true 时通过 inline animation；reduced motion 走 CSS 自动尊重。
 */
export function GradientText({
  children,
  className,
  gradientClassName = 'from-[hsl(var(--brand-500))] via-[hsl(var(--brand-accent-500))] to-[hsl(var(--brand-500))]',
  animate = false,
  as: Tag = 'span',
}: GradientTextProps) {
  const style: CSSProperties = animate
    ? {
        backgroundSize: '300% 300%',
        animation: 'lj-gradient-flow 8s linear infinite',
      }
    : {};

  return (
    <>
      <Tag
        className={cn(
          'bg-gradient-to-r bg-clip-text text-transparent',
          gradientClassName,
          className
        )}
        style={style}
      >
        {children}
      </Tag>
      {animate ? (
        <style jsx global>{`
          @keyframes lj-gradient-flow {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-no-animate] {
              animation: none !important;
            }
          }
        `}</style>
      ) : null}
    </>
  );
}
