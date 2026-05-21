'use client';

import { useRef, type MouseEvent, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

export interface SpotlightProps {
  children: ReactNode;
  className?: string;
  /** 光斑半径 px */
  radius?: number;
  /** 光斑 RGB 颜色 */
  color?: string;
}

/**
 * Spotlight 鼠标跟随光：
 * 适合在 hero 内大卡片上做"指针有引力"的效果。
 */
export function Spotlight({
  children,
  className,
  radius = 320,
  color = 'rgba(99,102,241,0.18)',
}: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const mx = useMotionValue(-9999);
  const my = useMotionValue(-9999);
  const sx = useSpring(mx, { stiffness: 300, damping: 30 });
  const sy = useSpring(my, { stiffness: 300, damping: 30 });

  function onMove(e: MouseEvent<HTMLDivElement>) {
    if (reduced) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => {
        mx.set(-9999);
        my.set(-9999);
      }}
      className={cn('relative overflow-hidden', className)}
    >
      {!reduced && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(${radius}px circle at var(--sx) var(--sy), ${color}, transparent 70%)`,
            ['--sx' as never]: sx,
            ['--sy' as never]: sy,
          }}
        />
      )}
      {children}
    </div>
  );
}
