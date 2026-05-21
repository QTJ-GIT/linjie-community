'use client';

import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

export interface AuroraProps {
  className?: string;
  /** 强度，控制色斑透明度（0-1）。默认 0.55 */
  intensity?: number;
}

/**
 * Aurora 极光背景：
 *
 * 三个大色斑 + blur-3xl + 慢速 keyframe 漂移。配合 mix-blend，
 * 在亮色/暗色下都柔和。
 *
 * - 尊重 prefers-reduced-motion：降级为静态渐变
 * - 用绝对定位，套在 relative 父级里
 * - 移动端可通过外层 hidden md:block 控制
 */
export function Aurora({ className, intensity = 0.55 }: AuroraProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 overflow-hidden',
          className
        )}
      >
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              'radial-gradient(60% 50% at 30% 30%, hsl(var(--brand-500) / 0.35), transparent 70%), radial-gradient(50% 40% at 80% 60%, hsl(var(--brand-accent-500) / 0.30), transparent 70%)',
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className
      )}
      style={{ opacity: intensity }}
    >
      <motion.div
        className="absolute -left-20 -top-20 h-[28rem] w-[28rem] rounded-full bg-fuchsia-400 opacity-50 blur-3xl mix-blend-multiply dark:mix-blend-screen"
        animate={{ x: [0, 60, -20, 0], y: [0, 40, 10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[-6rem] top-12 h-[28rem] w-[28rem] rounded-full bg-cyan-300 opacity-45 blur-3xl mix-blend-multiply dark:mix-blend-screen"
        animate={{ x: [0, -40, 20, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-6rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-indigo-400 opacity-50 blur-3xl mix-blend-multiply dark:mix-blend-screen"
        animate={{ x: [0, 30, -50, 0], y: [0, -30, 20, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
