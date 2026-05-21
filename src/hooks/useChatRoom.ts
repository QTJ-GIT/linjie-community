'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ChatMessage, ChatMessageWithAuthor, Profile } from '@/types/domain';
import { useRealtimeChannel } from './useRealtimeChannel';

type AuthorLite = Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;

export type ClientMessageStatus = 'pending' | 'success' | 'error';

export type ClientChatMessage = ChatMessageWithAuthor & {
  status?: ClientMessageStatus;
};

export interface UseChatRoomOptions {
  roomSlug: string;
  initialMessages: ChatMessageWithAuthor[];
  currentUserId: string | null;
  currentUserSelf?: AuthorLite | null;
  onInsert?: (msg: ChatMessageWithAuthor) => void;
}

export interface UseChatRoomResult {
  messages: ClientChatMessage[];
  sendMessage: (body: string) => Promise<void>;
  sending: boolean;
  loadOlder: () => Promise<void>;
  hasMore: boolean;
  loadingOlder: boolean;
}

const OLDER_PAGE_SIZE = 30;

/**
 * Higher-level hook that manages chat room state with Supabase Realtime.
 * - Optimistic UI: pending -> success/error transitions, dedup by client-generated id
 * - Insert returns row joined with author profile, eliminating per-message N+1 author fetch
 * - Realtime INSERTs from other clients still dedup by id and resolve author from cache
 */
export function useChatRoom({
  roomSlug,
  initialMessages,
  currentUserId,
  currentUserSelf,
  onInsert,
}: UseChatRoomOptions): UseChatRoomResult {
  const [messages, setMessages] = useState<ClientChatMessage[]>(initialMessages);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const oldestLoadedAtRef = useRef<string | null>(initialMessages[0]?.created_at ?? null);
  const supabase = useMemo(() => createClient(), []);

  const profileCacheRef = useRef<Map<string, AuthorLite>>(new Map());
  useEffect(() => {
    for (const m of initialMessages) {
      if (m.author) profileCacheRef.current.set(m.author.id, m.author);
    }
    if (currentUserSelf) profileCacheRef.current.set(currentUserSelf.id, currentUserSelf);
  }, [initialMessages, currentUserSelf]);

  useEffect(() => {
    setMessages(initialMessages);
    oldestLoadedAtRef.current = initialMessages[0]?.created_at ?? null;
    setHasMore(true);
  }, [initialMessages]);

  const resolveAuthor = useCallback(
    async (authorId: string): Promise<AuthorLite> => {
      const cached = profileCacheRef.current.get(authorId);
      if (cached) return cached;
      const { data } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar_url')
        .eq('id', authorId)
        .maybeSingle();
      const author: AuthorLite = data ?? {
        id: authorId,
        handle: '未知',
        display_name: '未知用户',
        avatar_url: null,
      };
      profileCacheRef.current.set(authorId, author);
      return author;
    },
    [supabase]
  );

  useRealtimeChannel<ChatMessage>({
    channel: `room:${roomSlug}`,
    table: 'chat_messages',
    event: 'INSERT',
    filter: `room_slug=eq.${roomSlug}`,
    onChange: async (payload) => {
      const row = payload.new as ChatMessage | undefined;
      if (!row || !row.id) return;
      const author = await resolveAuthor(row.author_id);
      const withAuthor: ClientChatMessage = { ...row, author, status: 'success' };
      setMessages((prev) => {
        // dedup: if this id already exists (e.g. our own optimistic insert), keep existing
        if (prev.some((m) => m.id === withAuthor.id)) return prev;
        const next = [...prev, withAuthor];
        next.sort((a, b) => a.created_at.localeCompare(b.created_at));
        return next;
      });
      onInsert?.(withAuthor);
    },
  });

  const sendMessage = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed || !currentUserId) return;
      const tempId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const cachedSelf = profileCacheRef.current.get(currentUserId);
      const optimisticAuthor: AuthorLite = cachedSelf ?? {
        id: currentUserId,
        handle: '',
        display_name: '我',
        avatar_url: null,
      };

      const optimistic: ClientChatMessage = {
        id: tempId,
        room_slug: roomSlug,
        author_id: currentUserId,
        body: trimmed,
        created_at: new Date().toISOString(),
        author: optimisticAuthor,
        status: 'pending',
      };

      setMessages((prev) => {
        const next = [...prev, optimistic];
        next.sort((a, b) => a.created_at.localeCompare(b.created_at));
        return next;
      });
      setSending(true);

      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            id: tempId,
            room_slug: roomSlug,
            author_id: currentUserId,
            body: trimmed,
          })
          .select('*, author:profiles(id, handle, display_name, avatar_url)')
          .single();
        if (error || !data) throw error ?? new Error('insert failed');

        const row = data as ChatMessageWithAuthor;
        if (row.author) profileCacheRef.current.set(row.author.id, row.author);
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...row, status: 'success' as const } : m))
        );
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'error' as const } : m))
        );
        throw err;
      } finally {
        setSending(false);
      }
    },
    [supabase, roomSlug, currentUserId]
  );

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore) return;
    const cursor = oldestLoadedAtRef.current;
    if (!cursor) {
      setHasMore(false);
      return;
    }
    setLoadingOlder(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, author:profiles(id, handle, display_name, avatar_url)')
        .eq('room_slug', roomSlug)
        .lt('created_at', cursor)
        .order('created_at', { ascending: false })
        .limit(OLDER_PAGE_SIZE);
      if (error) throw error;
      const rows = (data ?? []) as ChatMessageWithAuthor[];
      if (rows.length < OLDER_PAGE_SIZE) setHasMore(false);
      if (rows.length === 0) return;

      // rows are desc; we want asc to merge into head
      const asc = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
      for (const r of asc) {
        if (r.author) profileCacheRef.current.set(r.author.id, r.author);
      }
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const additions: ClientChatMessage[] = [];
        for (const r of asc) {
          if (seen.has(r.id)) continue;
          seen.add(r.id);
          additions.push({ ...r, status: 'success' as const });
        }
        if (additions.length === 0) return prev;
        return [...additions, ...prev];
      });
      oldestLoadedAtRef.current = asc[0]!.created_at;
    } finally {
      setLoadingOlder(false);
    }
  }, [supabase, roomSlug, hasMore, loadingOlder]);

  return { messages, sendMessage, sending, loadOlder, hasMore, loadingOlder };
}
