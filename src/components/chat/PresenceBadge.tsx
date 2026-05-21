'use client';

import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePresence, type PresenceUser } from '@/hooks/usePresence';

export interface PresenceBadgeProps {
  roomSlug: string;
  self: PresenceUser | null;
  className?: string;
}

export function PresenceBadge({ roomSlug, self, className }: PresenceBadgeProps) {
  const { onlineUsers } = usePresence({ roomSlug, self });
  const count = onlineUsers.length;
  const title = onlineUsers
    .map((u) => u.display_name || u.handle)
    .slice(0, 20)
    .join('、');

  return (
    <span
      title={title || undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground',
        className,
      )}
    >
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inset-0 rounded-full bg-emerald-500" />
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
      </span>
      <Users className="h-3 w-3" />
      <span className="tabular-nums">在线 {count}</span>
    </span>
  );
}
