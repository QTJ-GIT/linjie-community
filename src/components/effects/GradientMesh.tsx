'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

export interface GradientMeshProps {
  className?: string;
  /** 模糊半径，默认 60 */
  blur?: number;
}

/**
 * GradientMesh 渐变网格背景 —— 用作 feed 顶部 hero stripe 这种低高度装饰。
 * 比 Aurora 更"有材质"，但更内敛。
 */
export function GradientMesh({ className, blur = 60 }: GradientMeshProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div
        aria-hidden
        className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
        style={{
          background:
            'conic-gradient(from 30deg at 30% 50%, hsl(var(--brand-accent-500) / 0.35), hsl(var(--brand-500) / 0.30), hsl(var(--brand-accent-500) / 0.25), hsl(var(--brand-500) / 0.30))',
          filter: `blur(${blur}px)`,
        }}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'conic-gradient(from 0deg at 30% 40%, hsl(var(--brand-accent-500) / 0.55), hsl(var(--brand-500) / 0.55), hsl(217 91% 60% / 0.45), hsl(var(--brand-accent-500) / 0.55))',
          filter: `blur(${blur}px)`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            'conic-gradient(from 180deg at 70% 60%, hsl(38 92% 60% / 0.30), hsl(160 84% 50% / 0.25), hsl(217 91% 60% / 0.30), hsl(38 92% 60% / 0.30))',
          filter: `blur(${blur + 10}px)`,
          mixBlendMode: 'screen',
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}
