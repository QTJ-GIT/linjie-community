'use client';

import { useRef, type MouseEvent, type ReactNode } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

export interface TiltGlossProps {
  children: ReactNode;
  className?: string;
  /** 倾斜最大角度 */
  maxTilt?: number;
  /** 高光半径 px */
  glossRadius?: number;
}

/**
 * TiltGloss —— 鼠标位置驱动 3D 倾斜 + 跟随高光。
 * 用作 PostCard hover、卡片型 CTA。父级需要 perspective（已自带）。
 */
export function TiltGloss({
  children,
  className,
  maxTilt = 6,
  glossRadius = 220,
}: TiltGlossProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const smx = useSpring(mx, { stiffness: 200, damping: 25 });
  const smy = useSpring(my, { stiffness: 200, damping: 25 });

  const rotateY = useTransform(smx, [0, 1], [-maxTilt, maxTilt]);
  const rotateX = useTransform(smy, [0, 1], [maxTilt, -maxTilt]);
  const glossX = useTransform(smx, (v) => `${v * 100}%`);
  const glossY = useTransform(smy, (v) => `${v * 100}%`);
  const gloss = useMotionTemplate`radial-gradient(${glossRadius}px circle at ${glossX} ${glossY}, hsl(var(--brand-500) / 0.10), transparent 60%)`;

  function onMove(e: MouseEvent<HTMLDivElement>) {
    if (reduced) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  }

  function onLeave() {
    mx.set(0.5);
    my.set(0.5);
  }

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn('relative', className)} style={{ perspective: 1000 }}>
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative h-full w-full"
      >
        {children}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ background: gloss }}
        />
      </motion.div>
    </div>
  );
}
