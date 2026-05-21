'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react';
import Link from 'next/link';
import { Send, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { SmartTime } from '@/components/smart-time';
import { useDmThread, type ClientDmMessage } from '@/hooks/useDmThread';
import { markThreadRead } from '@/actions/dm';
import type { DmMessageWithSender, Profile } from '@/types/domain';

// Switch to virtualization once threads grow long enough to matter.
const VIRTUALIZE_THRESHOLD = 50;

type UserLite = Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;

export interface DmThreadProps {
  threadId: string;
  initialMessages: DmMessageWithSender[];
  currentUserId: string | null;
  otherUser: UserLite;
  className?: string;
}

const MAX_LEN = 4000;

export function DmThread({
  threadId,
  initialMessages,
  currentUserId,
  otherUser,
  className,
}: DmThreadProps) {
  const knownProfiles = useMemo(() => [otherUser], [otherUser]);
  const { messages, sendMessage, sending } = useDmThread({
    threadId,
    initialMessages,
    currentUserId,
    knownProfiles,
  });
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const disabled = !currentUserId || sending;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  // Mark as read whenever new messages arrive and we have unread ones
  useEffect(() => {
    if (!currentUserId) return;
    const hasUnread = messages.some(
      (m) => m.sender_id !== currentUserId && m.read_at === null
    );
    if (hasUnread) {
      void markThreadRead(threadId);
    }
  }, [messages, currentUserId, threadId]);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const value = draft.trim();
    if (!value || disabled) return;
    if (value.length > MAX_LEN) {
      toast.error(`消息过长（最多 ${MAX_LEN} 字）`);
      return;
    }
    try {
      setDraft('');
      await sendMessage(value);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '发送失败，请稍后再试';
      toast.error(msg);
      setDraft(value);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  const fallback =
    otherUser.display_name?.slice(0, 1) || otherUser.handle.slice(0, 1) || '?';

  return (
    <div
      className={cn(
        'flex h-[calc(100vh-10rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm',
        className
      )}
    >
      <header className="border-b border-border/60 bg-card/70 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/55">
        <Link href={`/profile/${otherUser.handle}`} className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {otherUser.avatar_url ? (
              <AvatarImage src={otherUser.avatar_url} alt={otherUser.display_name} />
            ) : null}
            <AvatarFallback className="text-xs">{fallback}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">{otherUser.display_name}</div>
            <div className="truncate font-mono text-[11px] text-muted-foreground">@{otherUser.handle}</div>
          </div>
        </Link>
      </header>

      <div className="min-h-0 flex-1">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            发送第一条消息吧。
          </div>
        ) : messages.length > VIRTUALIZE_THRESHOLD ? (
          <VirtualizedDmMessages
            messages={messages}
            currentUserId={currentUserId}
            bottomRef={bottomRef}
          />
        ) : (
          <ScrollArea className="h-full w-full">
            <div className="flex flex-col gap-2 px-4 py-4">
              {messages.map((m) => (
                <DmBubble key={m.id} m={m} mine={m.sender_id === currentUserId} />
              ))}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        )}
      </div>

      {currentUserId ? (
        <form onSubmit={submit} className="border-t border-border/60 bg-background/40 px-3 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="写点什么…"
              maxLength={MAX_LEN}
              rows={1}
              className={cn(
                'flex min-h-[40px] max-h-40 w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm leading-relaxed',
                'placeholder:text-muted-foreground',
                'focus-visible:border-[hsl(var(--brand-500))]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-500))]/30',
                'disabled:opacity-50 transition-colors'
              )}
              disabled={disabled}
            />
            <Button
              type="submit"
              size="icon"
              disabled={disabled || !draft.trim()}
              aria-label="发送"
              className="h-10 w-10 shrink-0 rounded-xl"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-1.5 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
            <kbd className="rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">
              Enter
            </kbd>
            <span>发送</span>
            <span className="mx-1">·</span>
            <kbd className="rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">
              Shift+Enter
            </kbd>
            <span>换行</span>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-3 text-sm text-muted-foreground">
          <span>请先登录以发送私信</span>
          <Button asChild size="sm" variant="outline">
            <Link href="/login">去登录</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function DmBubble({ m, mine }: { m: ClientDmMessage; mine: boolean }) {
  const status = m.status;
  return (
    <div className={cn('flex w-full', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex max-w-[75%] flex-col gap-1', mine ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed transition-opacity',
            mine
              ? 'bg-[hsl(var(--brand-500))]/12 text-foreground border border-[hsl(var(--brand-500))]/25 dark:bg-[hsl(var(--brand-500))]/20'
              : 'bg-muted/50 text-foreground',
            status === 'pending' && 'opacity-60',
            status === 'error' && 'border border-destructive/40 bg-destructive/10 text-destructive'
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
        <SmartTime iso={m.created_at} className="font-mono text-[10px] text-muted-foreground/80" />
      </div>
    </div>
  );
}

function VirtualizedDmMessages({
  messages,
  currentUserId,
  bottomRef,
}: {
  messages: ClientDmMessage[];
  currentUserId: string | null;
  bottomRef: RefObject<HTMLDivElement>;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 8,
    getItemKey: (i) => messages[i]!.id,
  });

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
  }, [messages.length]);

  const vItems = virtualizer.getVirtualItems();
  const total = virtualizer.getTotalSize();

  return (
    <div ref={parentRef} className="relative h-full w-full overflow-auto">
      <div style={{ height: `${total}px`, width: '100%', position: 'relative' }}>
        {vItems.map((vi) => {
          const m = messages[vi.index]!;
          const mine = m.sender_id === currentUserId;
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
            >
              <div className="px-4 py-1">
                <DmBubble m={m} mine={mine} />
              </div>
            </div>
          );
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
