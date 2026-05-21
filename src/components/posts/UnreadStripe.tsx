'use client';

import { useEffect, useState } from 'react';
import { useLastVisited } from '@/hooks/useLastVisited';
import { cn } from '@/lib/utils';

export interface UnreadStripeProps {
  /** Post 的 created_at ISO 字符串 */
  createdAt: string;
  /** 命名空间，对应 useLastVisited 的 scope，例如 'feed' */
  scope?: string;
  className?: string;
}

/**
 * UnreadStripe —— 客户端比较 post.created_at 与 localStorage 中
 * 上次访问时间，若帖子较新则在父级容器左缘渲染 2px 强调色竖线。
 *
 * 父容器需要 position: relative，stripe 自身用 absolute 定位。
 *
 * SSR 时不渲染（避免 hydration mismatch）；mount 后再决定是否渲染。
 */
export function UnreadStripe({ createdAt, scope = 'feed', className }: UnreadStripeProps) {
  const { lastVisitedAt } = useLastVisited(scope);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  // First-ever visit: no marker (otherwise everything is "unread")
  if (!lastVisitedAt) return null;
  if (createdAt <= lastVisitedAt) return null;

  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute left-0 top-2 bottom-2 w-[2px] rounded-r bg-[hsl(var(--brand-500))]',
          className
        )}
      />
      <span className="sr-only">未读</span>
    </>
  );
}
