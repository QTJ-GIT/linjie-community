'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/domain';

export type PresenceUser = Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;

export interface UsePresenceOptions {
  roomSlug: string;
  self: PresenceUser | null;
}

export interface UsePresenceResult {
  onlineUsers: PresenceUser[];
}

/**
 * Tracks presence for a chat room via Supabase Realtime presence.
 * Each client tracks its own identity. Returns the deduped list of online users.
 *
 * Note: depends only on self?.id (not the whole self object) to avoid
 * unnecessary re-subscribes when the parent re-renders with an unstable self ref.
 */
export function usePresence({ roomSlug, self }: UsePresenceOptions): UsePresenceResult {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const supabase = useMemo(() => createClient(), []);

  const selfRef = useRef(self);
  useEffect(() => {
    selfRef.current = self;
  }, [self]);

  const selfId = self?.id ?? null;

  useEffect(() => {
    if (!selfId) return;
    const channel = supabase.channel(`presence:${roomSlug}`, {
      config: { presence: { key: selfId } },
    });

    const syncState = () => {
      const state = channel.presenceState<PresenceUser>();
      const users = new Map<string, PresenceUser>();
      for (const key of Object.keys(state)) {
        const metas = state[key];
        if (metas && metas.length > 0) {
          const m = metas[0];
          users.set(key, {
            id: m.id,
            handle: m.handle,
            display_name: m.display_name,
            avatar_url: m.avatar_url ?? null,
          });
        }
      }
      setOnlineUsers(Array.from(users.values()));
    };

    channel
      .on('presence', { event: 'sync' }, syncState)
      .on('presence', { event: 'join' }, syncState)
      .on('presence', { event: 'leave' }, syncState)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const current = selfRef.current;
          if (!current) return;
          await channel.track({
            id: current.id,
            handle: current.handle,
            display_name: current.display_name,
            avatar_url: current.avatar_url,
          });
        }
      });

    return () => {
      void channel.untrack().catch(() => undefined);
      supabase.removeChannel(channel);
    };
  }, [supabase, roomSlug, selfId]);

  return { onlineUsers };
}
