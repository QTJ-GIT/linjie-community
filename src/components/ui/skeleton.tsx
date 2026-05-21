import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * 极简 shadcn 风格骨架屏组件。
 * 用法：<Skeleton className="h-4 w-32" />
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted/60', className)}
      aria-hidden="true"
      {...props}
    />
  );
}
