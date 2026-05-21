'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface GlowCardProps {
  children: ReactNode;
  className?: string;
  /** 边框流光颜色组 */
  colors?: string[];
  /** 内层背景类（默认 bg-card） */
  innerClassName?: string;
  /** 圆角 px */
  radius?: number;
}

/**
 * GlowCard 流光边框卡片：
 * 包一个内容容器，外层渐变边框（用 padding 充当），渐变 position 动画形成流光。
 */
export function GlowCard({
  children,
  className,
  colors = [
    'hsl(var(--brand-500))',
    'hsl(var(--brand-accent-500))',
    'hsl(217 91% 60%)',
    'hsl(var(--brand-500))',
  ],
  innerClassName,
  radius = 16,
}: GlowCardProps) {
  const reduced = useReducedMotion();

  const wrapperStyle = {
    background: `linear-gradient(120deg, ${colors.join(', ')})`,
    backgroundSize: '300% 300%',
    borderRadius: radius,
  } as const;

  const innerStyle = { borderRadius: radius - 2 } as const;

  if (reduced) {
    return (
      <div className={cn('relative p-[1.5px]', className)} style={wrapperStyle}>
        <div className={cn('h-full bg-card', innerClassName)} style={innerStyle}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={cn('relative p-[1.5px]', className)}
      style={wrapperStyle}
      animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    >
      <div className={cn('h-full bg-card', innerClassName)} style={innerStyle}>
        {children}
      </div>
    </motion.div>
  );
}
