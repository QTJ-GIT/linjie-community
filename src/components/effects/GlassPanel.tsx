import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  /** 边框可选 */
  bordered?: boolean;
}

/**
 * GlassPanel —— 玻璃拟态面板。亮色下用浅白叠加，暗色下用浅色透明。
 *
 * 使用 backdrop-blur，需要父级允许半透明可见的背景。
 */
export function GlassPanel({ children, className, bordered = true }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-white/60 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-white/55 dark:bg-white/5 dark:supports-[backdrop-filter]:bg-white/5',
        bordered && 'border border-white/30 dark:border-white/10 shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}
