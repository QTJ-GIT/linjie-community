'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export interface UseTypingOptions {
  roomSlug: string;
  userId: string | null;
  displayName?: string | null;
  /** minimum ms between broadcasts */
  throttleMs?: number;
  /** how long to keep a user marked typing after their last event */
  lingerMs?: number;
}

export interface TypingUser {
  userId: string;
  displayName: string | null;
}

export interface UseTypingResult {
  typingUsers: TypingUser[];
  sendTyping: () => void;
}

/**
 * Broadcast-based typing indicator. Uses Supabase Realtime 'broadcast' channel.
 * Other peers in the same room see the typing event for up to `lingerMs`.
 */
export function useTyping({
  roomSlug,
  userId,
  displayName,
  throttleMs = 500,
  lingerMs = 3000,
}: UseTypingOptions): UseTypingResult {
  const [typingMap, setTypingMap] = useState<Map<string, { name: string | null; expiresAt: number }>>(
    () => new Map(),
  );
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSentRef = useRef<number>(0);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    const channel = supabase.channel(`typing:${roomSlug}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'typing' }, (msg) => {
        const payload = (msg.payload ?? {}) as { userId?: string; displayName?: string | null };
        if (!payload.userId || payload.userId === userId) return;
        const uid = payload.userId;
        const name = payload.displayName ?? null;
        const expiresAt = Date.now() + lingerMs;
        setTypingMap((prev) => {
          const next = new Map(prev);
          next.set(uid, { name, expiresAt });
          return next;
        });
        const existing = timers.get(uid);
        if (existing) clearTimeout(existing);
        const t = setTimeout(() => {
          setTypingMap((prev) => {
            const next = new Map(prev);
            next.delete(uid);
            return next;
          });
          timers.delete(uid);
        }, lingerMs);
        timers.set(uid, t);
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [supabase, roomSlug, userId, lingerMs]);

  const sendTyping = useCallback(() => {
    if (!userId || !channelRef.current) return;
    const now = Date.now();
    if (now - lastSentRef.current < throttleMs) return;
    lastSentRef.current = now;
    void channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, displayName: displayName ?? null },
    });
  }, [userId, displayName, throttleMs]);

  const typingUsers: TypingUser[] = Array.from(typingMap.entries()).map(([uid, v]) => ({
    userId: uid,
    displayName: v.name,
  }));

  return { typingUsers, sendTyping };
}
