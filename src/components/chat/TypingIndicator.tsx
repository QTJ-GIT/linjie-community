'use client';

import { cn } from '@/lib/utils';
import type { TypingUser } from '@/hooks/useTyping';

export interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
}

export function TypingIndicator({ typingUsers, className }: TypingIndicatorProps) {
  if (typingUsers.length === 0) {
    return <div className={cn('h-4', className)} aria-hidden />;
  }
  const names = typingUsers
    .map((u) => u.displayName || '有人')
    .slice(0, 3)
    .join('、');
  const more = typingUsers.length > 3 ? ` 等 ${typingUsers.length} 人` : '';

  return (
    <div
      className={cn(
        'flex h-4 items-center gap-1 px-4 text-xs text-muted-foreground',
        className,
      )}
      aria-live="polite"
    >
      <span className="inline-flex gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
      </span>
      <span>
        {names}
        {more} 正在输入…
      </span>
    </div>
  );
}
