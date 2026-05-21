'use client';

import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useChatRoom } from '@/hooks/useChatRoom';
import { useTyping } from '@/hooks/useTyping';
import type { ChatMessageWithAuthor } from '@/types/domain';
import { MessageList } from './MessageList';
import { PresenceBadge } from './PresenceBadge';
import { TypingIndicator } from './TypingIndicator';
import type { PresenceUser } from '@/hooks/usePresence';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export interface ChatRoomProps {
  roomSlug: string;
  roomName?: string;
  roomKind?: 'global' | 'ticker';
  initialMessages: ChatMessageWithAuthor[];
  currentUserId: string | null;
  className?: string;
}

const MAX_LEN = 2000;

export function ChatRoom({
  roomSlug,
  roomName,
  roomKind,
  initialMessages,
  currentUserId,
  className,
}: ChatRoomProps) {
  // selfProfile is resolved below; pass it to useChatRoom for optimistic UI avatar
  const [selfProfile, setSelfProfile] = useState<PresenceUser | null>(null);
  const { messages, sendMessage, sending, loadOlder, hasMore, loadingOlder } = useChatRoom({
    roomSlug,
    initialMessages,
    currentUserId,
    currentUserSelf: selfProfile,
  });
  const [draft, setDraft] = useState('');

  // Resolve the current user's profile for presence tracking + optimistic UI
  const supabase = useMemo(() => createClient(), []);
  useEffect(() => {
    if (!currentUserId) {
      setSelfProfile(null);
      return;
    }
    let cancelled = false;
    void supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url')
      .eq('id', currentUserId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setSelfProfile(
          data ?? {
            id: currentUserId,
            handle: '',
            display_name: '',
            avatar_url: null,
          },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, currentUserId]);

  const { typingUsers, sendTyping } = useTyping({
    roomSlug,
    userId: currentUserId,
    displayName: selfProfile?.display_name ?? null,
  });

  const disabled = !currentUserId || sending;

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

  return (
    <div
      className={cn(
        'flex h-[calc(100vh-12rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm',
        className
      )}
    >
      {/* 玻璃拟态 header */}
      <header className="relative border-b border-border/60 bg-card/70 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/55">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-sm font-semibold tracking-tight">
              {roomName ?? roomSlug}
            </h2>
            {roomKind ? (
              <Badge variant="secondary" className="h-5 px-1.5 py-0 text-[10px] font-medium">
                {roomKind === 'ticker' ? '股票' : '大厅'}
              </Badge>
            ) : null}
            <PresenceBadge roomSlug={roomSlug} self={selfProfile} />
          </div>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {messages.length} 条消息
          </span>
        </div>
        {/* typing 提示 — 紧贴 header 底部细条 */}
        <TypingIndicator typingUsers={typingUsers} />
      </header>

      <div className="min-h-0 flex-1">
        <MessageList
          messages={messages}
          onLoadOlder={loadOlder}
          hasMore={hasMore}
          loadingOlder={loadingOlder}
        />
      </div>

      {currentUserId ? (
        <form
          onSubmit={submit}
          className="border-t border-border/60 bg-background/40 px-3 py-3"
        >
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                sendTyping();
              }}
              onKeyDown={onKeyDown}
              placeholder="说点什么…"
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
              Shift
            </kbd>
            <span>+</span>
            <kbd className="rounded border border-border/60 bg-muted/50 px-1.5 py-0.5 font-mono text-[10px]">
              Enter
            </kbd>
            <span>换行</span>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-3 text-sm text-muted-foreground">
          <span>请先登录以发送消息</span>
          <Button asChild size="sm" variant="outline">
            <Link href="/login">去登录</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
