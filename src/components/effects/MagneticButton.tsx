'use client';

import { useRef, type MouseEvent, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

export interface MagneticButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  /** 磁吸强度 (0-1)，默认 0.35 */
  strength?: number;
  type?: 'button' | 'submit';
  /** native button props 透传 */
  ariaLabel?: string;
}

/**
 * MagneticButton 磁吸按钮：
 * 鼠标进入 → 元素被"拽"向光标。useSpring 让位移有阻尼。
 *
 * - 尊重 prefers-reduced-motion：退化成普通按钮
 * - 内层用 motion.span 加点轻微 3D rotate，避免文字反向"漂"
 */
export function MagneticButton({
  children,
  onClick,
  className,
  strength = 0.35,
  type = 'button',
  ariaLabel,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 22 });
  const sy = useSpring(y, { stiffness: 250, damping: 22 });
  const rotateX = useTransform(sy, [-30, 30], [6, -6]);
  const rotateY = useTransform(sx, [-30, 30], [-6, 6]);

  function onMove(e: MouseEvent<HTMLButtonElement>) {
    if (reduced) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    x.set((e.clientX - cx) * strength);
    y.set((e.clientY - cy) * strength);
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      aria-label={ariaLabel}
      style={reduced ? undefined : { x: sx, y: sy, rotateX, rotateY }}
      className={cn(
        'inline-flex select-none items-center justify-center transition-shadow',
        className
      )}
    >
      {children}
    </motion.button>
  );
}
