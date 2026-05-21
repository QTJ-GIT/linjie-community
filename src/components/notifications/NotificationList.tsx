'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EmptyState } from '@/components/empty-state';
import { SmartTime } from '@/components/smart-time';
import { cn } from '@/lib/utils';
import type { NotificationKind, NotificationWithActor } from '@/types/domain';

type Props = {
  items: NotificationWithActor[];
  onRead?: (id: string) => void;
  emptyLabel?: string;
  className?: string;
};

// Threshold above which we switch to virtualization.
const VIRTUALIZE_THRESHOLD = 30;

export function NotificationList({ items, onRead, emptyLabel = '目前没有通知', className }: Props) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title={emptyLabel}
        className={className}
      />
    );
  }

  if (items.length > VIRTUALIZE_THRESHOLD) {
    return <VirtualizedNotificationList items={items} onRead={onRead} className={className} />;
  }

  return (
    <ul className={cn('divide-y divide-border', className)}>
      {items.map((n) => (
        <li key={n.id}>
          <NotificationRow n={n} onRead={onRead} />
        </li>
      ))}
    </ul>
  );
}

function VirtualizedNotificationList({
  items,
  onRead,
  className,
}: {
  items: NotificationWithActor[];
  onRead?: (id: string) => void;
  className?: string;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 6,
    getItemKey: (i) => items[i]!.id,
  });

  const vItems = virtualizer.getVirtualItems();
  const total = virtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      className={cn('relative max-h-[70vh] w-full overflow-auto', className)}
    >
      <div style={{ height: `${total}px`, width: '100%', position: 'relative' }}>
        {vItems.map((vi) => {
          const n = items[vi.index]!;
          return (
            <div
              key={vi.key}
              ref={virtualizer.measureElement}
              data-index={vi.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vi.start}px)`,
              }}
              className="border-b border-border"
            >
              <NotificationRow n={n} onRead={onRead} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NotificationRow({
  n,
  onRead,
}: {
  n: NotificationWithActor;
  onRead?: (id: string) => void;
}) {
  const href = buildHref(n);
  const actorName = n.actor?.display_name ?? '某位用户';
  const text = buildText(n.kind);
  const unread = !n.read_at;

  return (
    <Link
      href={href}
      prefetch={false}
      onClick={() => unread && onRead?.(n.id)}
      className={cn(
        'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-accent/60',
        unread && 'bg-accent/30'
      )}
    >
      <Avatar className="h-9 w-9">
        {n.actor?.avatar_url && (
          <AvatarImage src={n.actor.avatar_url} alt={actorName} />
        )}
        <AvatarFallback>
          {(n.actor?.display_name ?? '?').slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className="font-medium">{actorName}</span>
          <span className="text-muted-foreground"> {text.suffix}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          <SmartTime iso={n.created_at} />
        </p>
      </div>
      {unread && (
        <span
          aria-hidden
          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary"
        />
      )}
    </Link>
  );
}

function buildHref(n: NotificationWithActor): string {
  if (n.post_id) {
    return n.comment_id ? `/p/${n.post_id}#c-${n.comment_id}` : `/p/${n.post_id}`;
  }
  return '/notifications';
}

function buildText(kind: NotificationKind): { suffix: string } {
  switch (kind) {
    case 'comment_on_post':
      return { suffix: '评论了你的帖子' };
    case 'reply_to_comment':
      return { suffix: '回复了你的评论' };
    case 'mention':
      return { suffix: '在帖子或评论中提到了你' };
    case 'answer_accepted':
      return { suffix: '采纳了你的回答' };
    case 'like':
      return { suffix: '点赞了你的帖子或评论' };
    default:
      return { suffix: '与你相关的新动态' };
  }
}
