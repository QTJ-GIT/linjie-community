'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Notification, NotificationWithActor, Profile } from '@/types/domain';
import { markAsRead as markAsReadAction, markAllAsRead as markAllAsReadAction } from '@/actions/notifications';

const INITIAL_LIMIT = 20;

type ActorSlim = Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;

export function useNotifications() {
  const [items, setItems] = useState<NotificationWithActor[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;
    let cancelled = false;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setUserId(null);
        setItems([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const { data, error } = await supabase
        .from('notifications')
        .select(
          'id, recipient_id, actor_id, kind, post_id, comment_id, read_at, created_at, actor:profiles!notifications_actor_id_fkey(id, handle, display_name, avatar_url)'
        )
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(INITIAL_LIMIT);

      if (cancelled) return;
      if (!error && data) {
        const normalized = data.map((row: Record<string, unknown>) => ({
          ...(row as unknown as Notification),
          actor: (row.actor ?? null) as ActorSlim | null,
        })) as NotificationWithActor[];
        setItems(normalized);
        setUnreadCount(normalized.filter((n) => !n.read_at).length);
      }
      setLoading(false);
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`notif:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as Notification;
          let actor: ActorSlim | null = null;
          if (row.actor_id) {
            const { data: actorData } = await supabase
              .from('profiles')
              .select('id, handle, display_name, avatar_url')
              .eq('id', row.actor_id)
              .maybeSingle();
            actor = (actorData as ActorSlim | null) ?? null;
          }
          const next: NotificationWithActor = { ...row, actor };
          setItems((prev) => [next, ...prev].slice(0, 50));
          setUnreadCount((c) => c + 1);
          toast(buildToastText(next));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markRead = useCallback(
    async (id: string) => {
      const target = items.find((n) => n.id === id);
      if (!target || target.read_at) return;
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      const res = await markAsReadAction(id);
      if (!res.ok) {
        toast.error(res.error ?? '标记已读失败');
      }
    },
    [items]
  );

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    const nowIso = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: nowIso })));
    setUnreadCount(0);
    const res = await markAllAsReadAction();
    if (!res.ok) {
      toast.error(res.error ?? '标记全部已读失败');
    }
  }, [unreadCount]);

  return { items, unreadCount, markRead, markAllRead, loading };
}

function buildToastText(n: NotificationWithActor): string {
  const name = n.actor?.display_name ?? '有人';
  switch (n.kind) {
    case 'comment_on_post':
      return `${name} 评论了你的帖子`;
    case 'reply_to_comment':
      return `${name} 回复了你的评论`;
    case 'mention':
      return `${name} 提到了你`;
    case 'answer_accepted':
      return `${name} 采纳了你的回答`;
    case 'like':
      return `${name} 点赞了你`;
    default:
      return '你有一条新通知';
  }
}
