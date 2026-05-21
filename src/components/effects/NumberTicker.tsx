'use client';

import { useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useTransform,
} from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

export interface NumberTickerProps {
  to: number;
  /** 起始值，默认 0 */
  from?: number;
  /** 动画时长，默认 1.6s */
  duration?: number;
  /** 后缀（"+"、"%"、" 人"） */
  suffix?: string;
  /** 前缀（"$"、"¥"） */
  prefix?: string;
  /** 千分位 locale，默认 zh-CN */
  locale?: string;
  /** 是否使用 fixed-width 数字 */
  monospace?: boolean;
  className?: string;
}

/**
 * NumberTicker 数字滚动：
 * useMotionValue + animate() 在 viewport 时驱动 0 → to 过渡。
 * 尊重 prefers-reduced-motion：直接渲染目标值。
 */
export function NumberTicker({
  to,
  from = 0,
  duration = 1.6,
  suffix = '',
  prefix = '',
  locale = 'zh-CN',
  monospace = true,
  className,
}: NumberTickerProps) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: false });
  const mv = useMotionValue(from);
  const display = useTransform(mv, (v) => Math.round(v).toLocaleString(locale));
  const [text, setText] = useState(() => from.toLocaleString(locale));

  useEffect(() => {
    if (reduced) {
      setText(to.toLocaleString(locale));
      return;
    }
    const unsub = display.on('change', setText);
    return () => unsub();
  }, [display, locale, reduced, to]);

  useEffect(() => {
    if (reduced) return;
    if (!inView) return;
    mv.set(from);
    const controls = animate(mv, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [inView, mv, to, duration, from, reduced]);

  return (
    <motion.span
      ref={ref}
      className={cn(monospace && 'font-mono tabular-nums', className)}
    >
      {prefix}
      {text}
      {suffix}
    </motion.span>
  );
}
