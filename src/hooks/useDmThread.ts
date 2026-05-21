'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DmMessage, DmMessageWithSender, Profile } from '@/types/domain';
import { useRealtimeChannel } from './useRealtimeChannel';
import type { ClientMessageStatus } from './useChatRoom';

type SenderLite = Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;

export type ClientDmMessage = DmMessageWithSender & {
  status?: ClientMessageStatus;
};

export interface UseDmThreadOptions {
  threadId: string;
  initialMessages: DmMessageWithSender[];
  currentUserId: string | null;
  currentUserSelf?: SenderLite | null;
  knownProfiles?: SenderLite[];
  onInsert?: (msg: DmMessageWithSender) => void;
}

export interface UseDmThreadResult {
  messages: ClientDmMessage[];
  sendMessage: (body: string) => Promise<void>;
  sending: boolean;
}

/**
 * Realtime DM thread hook with optimistic UI.
 * Send flow: pending -> success/error, dedup by client-generated id.
 * Insert select-joins the sender profile to avoid per-message N+1.
 */
export function useDmThread({
  threadId,
  initialMessages,
  currentUserId,
  currentUserSelf,
  knownProfiles,
  onInsert,
}: UseDmThreadOptions): UseDmThreadResult {
  const [messages, setMessages] = useState<ClientDmMessage[]>(initialMessages);
  const [sending, setSending] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const senderCacheRef = useRef<Map<string, SenderLite>>(new Map());
  useEffect(() => {
    for (const m of initialMessages) {
      if (m.sender) senderCacheRef.current.set(m.sender.id, m.sender);
    }
    for (const p of knownProfiles ?? []) {
      senderCacheRef.current.set(p.id, p);
    }
    if (currentUserSelf) senderCacheRef.current.set(currentUserSelf.id, currentUserSelf);
  }, [initialMessages, knownProfiles, currentUserSelf]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const resolveSender = useCallback(
    async (senderId: string): Promise<SenderLite> => {
      const cached = senderCacheRef.current.get(senderId);
      if (cached) return cached;
      const { data } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar_url')
        .eq('id', senderId)
        .maybeSingle();
      const sender: SenderLite = data ?? {
        id: senderId,
        handle: '未知',
        display_name: '未知用户',
        avatar_url: null,
      };
      senderCacheRef.current.set(senderId, sender);
      return sender;
    },
    [supabase]
  );

  useRealtimeChannel<DmMessage>({
    channel: `dm:${threadId}`,
    table: 'dm_messages',
    event: 'INSERT',
    filter: `thread_id=eq.${threadId}`,
    onChange: async (payload) => {
      const row = payload.new as DmMessage | undefined;
      if (!row || !row.id) return;
      const sender = await resolveSender(row.sender_id);
      const withSender: ClientDmMessage = { ...row, sender, status: 'success' };
      setMessages((prev) => {
        if (prev.some((m) => m.id === withSender.id)) return prev;
        const next = [...prev, withSender];
        next.sort((a, b) => a.created_at.localeCompare(b.created_at));
        return next;
      });
      onInsert?.(withSender);
    },
  });

  const sendMessage = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed || !currentUserId) return;
      if (trimmed.length > 4000) throw new Error('消息最多 4000 字');
      const tempId =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const cachedSelf = senderCacheRef.current.get(currentUserId);
      const optimisticSender: SenderLite = cachedSelf ?? {
        id: currentUserId,
        handle: '',
        display_name: '我',
        avatar_url: null,
      };

      const optimistic: ClientDmMessage = {
        id: tempId,
        thread_id: threadId,
        sender_id: currentUserId,
        body: trimmed,
        read_at: null,
        created_at: new Date().toISOString(),
        sender: optimisticSender,
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
          .from('dm_messages')
          .insert({
            id: tempId,
            thread_id: threadId,
            sender_id: currentUserId,
            body: trimmed,
          })
          .select('*, sender:profiles(id, handle, display_name, avatar_url)')
          .single();
        if (error || !data) throw error ?? new Error('insert failed');

        const row = data as DmMessageWithSender;
        if (row.sender) senderCacheRef.current.set(row.sender.id, row.sender);
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
    [supabase, threadId, currentUserId]
  );

  return { messages, sendMessage, sending };
}
