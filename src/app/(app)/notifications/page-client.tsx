'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SmartTime } from '@/components/smart-time';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { NotificationKind, NotificationWithActor } from '@/types/domain';
import {
  markAllAsRead as markAllAsReadAction,
  markAsRead as markAsReadAction,
} from '@/actions/notifications';

export function NotificationsPageClient({
  initialItems,
  initialUnreadCount,
}: {
  initialItems: NotificationWithActor[];
  /** Total unread across all kinds (not just current filter). */
  initialUnreadCount: number;
}) {
  const reducedMotion = useReducedMotion();
  const [items, setItems] = useState<NotificationWithActor[]>(initialItems);
  const [globalUnread, setGlobalUnread] = useState<number>(initialUnreadCount);
  const [pending, startTransition] = useTransition();

  // Keep ordering stable (unread first → time desc) inside the visible filter.
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const aU = a.read_at ? 0 : 1;
      const bU = b.read_at ? 0 : 1;
      if (aU !== bU) return bU - aU;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [items]);

  const onRead = (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setGlobalUnread((c) => Math.max(0, c - 1));
    startTransition(async () => {
      const res = await markAsReadAction(id);
      if (!res.ok) toast.error(res.error ?? '标记失败');
    });
  };

  const onMarkAll = () => {
    if (globalUnread === 0) return;
    const nowIso = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: nowIso })));
    setGlobalUnread(0);
    startTransition(async () => {
      const res = await markAllAsReadAction();
      if (!res.ok) toast.error(res.error ?? '标记失败');
      else toast.success('已全部标为已读');
    });
  };

  return (
    <div className="space-y-3">
      {globalUnread > 0 ? (
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onMarkAll}
            disabled={pending}
            className={cn(
              'text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50',
              !reducedMotion && 'transition-colors'
            )}
          >
            全部标为已读
          </button>
        </div>
      ) : null}

      <ul className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
        {sorted.map((n) => (
          <li key={n.id}>
            <NotificationRow n={n} onRead={onRead} reducedMotion={reducedMotion} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function NotificationRow({
  n,
  onRead,
  reducedMotion,
}: {
  n: NotificationWithActor;
  onRead: (id: string) => void;
  reducedMotion: boolean;
}) {
  const href = buildHref(n);
  const actorName = n.actor?.display_name ?? n.actor?.handle ?? '某位用户';
  const actorHandle = n.actor?.handle;
  const text = buildText(n.kind);
  const unread = !n.read_at;

  return (
    <Link
      href={href}
      prefetch={false}
      onClick={() => unread && onRead(n.id)}
      className={cn(
        'relative flex items-start gap-3 px-4 py-3.5',
        !reducedMotion && 'transition-colors',
        'hover:bg-muted/40'
      )}
    >
      {/* unread 左缘竖线 */}
      {unread ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1.5 left-0 w-[2px] rounded-r bg-[hsl(var(--brand-500))]"
        />
      ) : null}

      <div className="relative shrink-0">
        <Avatar className={cn('h-8 w-8', !unread && 'opacity-80')}>
          {n.actor?.avatar_url ? (
            <AvatarImage src={n.actor.avatar_url} alt={actorName} />
          ) : null}
          <AvatarFallback>{actorName.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        {/* unread dot */}
        <span
          aria-hidden
          className={cn(
            'absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ring-2 ring-card',
            unread ? 'bg-[hsl(var(--brand-500))]' : 'bg-muted-foreground/20'
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-[1.7]">
          <span className={cn('font-medium', !unread && 'text-muted-foreground')}>
            {actorName}
          </span>
          {actorHandle ? (
            <span className="ml-1 font-mono text-[11px] text-muted-foreground">
              @{actorHandle}
            </span>
          ) : null}
          <span className={cn(unread ? 'text-foreground/85' : 'text-muted-foreground')}>
            {' '}
            {text}
          </span>
        </p>
        <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
          <SmartTime iso={n.created_at} />
        </p>
      </div>
    </Link>
  );
}

function buildHref(n: NotificationWithActor): string {
  if (n.post_id) {
    return n.comment_id ? `/posts/${n.post_id}#c-${n.comment_id}` : `/posts/${n.post_id}`;
  }
  return '/notifications';
}

function buildText(kind: NotificationKind): string {
  switch (kind) {
    case 'comment_on_post':
      return '评论了你的帖子';
    case 'reply_to_comment':
      return '回复了你的评论';
    case 'mention':
      return '在帖子或评论中提到了你';
    case 'answer_accepted':
      return '采纳了你的回答';
    case 'like':
      return '点赞了你的内容';
    default:
      return '与你相关的新动态';
  }
}
