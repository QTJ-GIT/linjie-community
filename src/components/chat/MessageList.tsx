'use client';

import { useMemo } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { SmartTime } from '@/components/smart-time';
import type { ChatMessageWithAuthor } from '@/types/domain';
import type { ClientChatMessage } from '@/hooks/useChatRoom';
import { useInfiniteScrollChat } from '@/hooks/useInfiniteScrollChat';

type AnyChatMessage = ChatMessageWithAuthor | ClientChatMessage;

interface MessageListProps {
  messages: AnyChatMessage[];
  className?: string;
  onLoadOlder?: () => void;
  hasMore?: boolean;
  loadingOlder?: boolean;
}

type Group = {
  key: string;
  author: AnyChatMessage['author'];
  startedAt: string;
  items: AnyChatMessage[];
};

function groupMessages(messages: AnyChatMessage[]): Group[] {
  const groups: Group[] = [];
  const THRESHOLD_MS = 2 * 60 * 1000;
  for (const m of messages) {
    const last = groups[groups.length - 1];
    const canJoin =
      last &&
      last.author.id === m.author.id &&
      new Date(m.created_at).getTime() - new Date(last.items[last.items.length - 1].created_at).getTime() <
        THRESHOLD_MS;
    if (canJoin) {
      last.items.push(m);
    } else {
      groups.push({ key: m.id, author: m.author, startedAt: m.created_at, items: [m] });
    }
  }
  return groups;
}

// virtualization disabled in week 1; see UPGRADE-ROADMAP for re-introduction plan.
// Retained as documentation: previously @tanstack/react-virtual kicked in once
// messages.length exceeded VIRTUALIZE_THRESHOLD. Combining virtualization with
// flex-col-reverse is non-trivial, so we ship a plain scroll container for now.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const VIRTUALIZE_THRESHOLD = Number.MAX_SAFE_INTEGER;

export function MessageList({
  messages,
  className,
  onLoadOlder,
  hasMore = false,
  loadingOlder = false,
}: MessageListProps) {
  const groups = useMemo(() => groupMessages(messages), [messages]);

  const noop = () => {};
  const { triggerRef } = useInfiniteScrollChat({
    hasMore: Boolean(onLoadOlder) && hasMore,
    loading: loadingOlder,
    onLoadMore: onLoadOlder ?? noop,
  });

  if (messages.length === 0) {
    return (
      <div className={cn('flex h-full items-center justify-center text-sm text-muted-foreground', className)}>
        还没有人发言，来做第一个吧。
      </div>
    );
  }

  // flex-col-reverse anchors the visual bottom to the start of the DOM list,
  // so appending newer messages to the array auto-sticks to the bottom in the
  // browser (no scrollIntoView needed). We reverse `groups` for rendering so
  // newest groups appear first in DOM order while still reading bottom-to-top.
  // Within each group, items remain in chronological order.
  const renderedGroups = groups.slice().reverse();

  return (
    <div className={cn('h-full w-full overflow-y-auto', className)}>
      <div className="flex flex-col-reverse gap-4 px-4 py-4">
        {renderedGroups.map((g) => (
          <GroupRow key={g.key} group={g} />
        ))}
        {/* Sentinel for IntersectionObserver — sits visually above the oldest message */}
        {onLoadOlder ? (
          <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
            {loadingOlder ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                加载更早消息…
              </span>
            ) : hasMore ? (
              <div ref={triggerRef} className="h-px w-full" />
            ) : (
              <span>没有更多消息了</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GroupRow({ group: g }: { group: Group }) {
  const fallback = g.author.display_name?.slice(0, 1) || g.author.handle.slice(0, 1);
  return (
    <div className="flex gap-3">
      <Avatar className="h-9 w-9 shrink-0">
        {g.author.avatar_url ? <AvatarImage src={g.author.avatar_url} alt={g.author.display_name} /> : null}
        <AvatarFallback className="text-xs">{fallback}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium">{g.author.display_name}</span>
          <span className="font-mono text-[11px] text-muted-foreground">@{g.author.handle}</span>
          <span className="font-mono text-[11px] text-muted-foreground/70">
            · <SmartTime iso={g.startedAt} />
          </span>
        </div>
        <div className="mt-1 flex flex-col gap-1">
          {g.items.map((m) => {
            const status = (m as ClientChatMessage).status;
            return (
              <div
                key={m.id}
                className={cn(
                  'whitespace-pre-wrap break-words rounded-xl bg-muted/40 px-3.5 py-2 text-sm leading-relaxed transition-opacity',
                  status === 'pending' && 'opacity-60',
                  status === 'error' &&
                    'border border-destructive/40 bg-destructive/10 text-destructive'
                )}
              >
                {m.body}
                {status === 'error' ? (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    发送失败
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
