import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DmList } from '@/components/dm/DmList';
import type { DmThreadWithPeer, Profile } from '@/types/domain';

export const dynamic = 'force-dynamic';

type ThreadRow = {
  id: string;
  user_a_id: string;
  user_b_id: string;
  last_message_at: string | null;
  created_at: string;
};

type ProfileLite = Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;

type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export default async function MessagesIndexPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirect=/messages');
  }

  const { data: threadsData, error: threadsErr } = await supabase
    .from('dm_threads')
    .select('id, user_a_id, user_b_id, last_message_at, created_at')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(100);

  if (threadsErr) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
        <h1 className="text-xl font-semibold">消息</h1>
        <p className="text-sm text-destructive">加载失败：{threadsErr.message}</p>
      </div>
    );
  }

  const threads = (threadsData ?? []) as ThreadRow[];
  const otherIds = Array.from(
    new Set(threads.map((t) => (t.user_a_id === user.id ? t.user_b_id : t.user_a_id)))
  );
  const threadIds = threads.map((t) => t.id);

  const [profilesRes, lastMsgRes, unreadRes] = await Promise.all([
    otherIds.length
      ? supabase
          .from('profiles')
          .select('id, handle, display_name, avatar_url')
          .in('id', otherIds)
      : Promise.resolve({ data: [] as ProfileLite[] }),
    threadIds.length
      ? supabase
          .from('dm_messages')
          .select('id, thread_id, sender_id, body, read_at, created_at')
          .in('thread_id', threadIds)
          .order('created_at', { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [] as MessageRow[] }),
    threadIds.length
      ? supabase
          .from('dm_messages')
          .select('thread_id, sender_id, read_at')
          .in('thread_id', threadIds)
          .is('read_at', null)
      : Promise.resolve({ data: [] as { thread_id: string; sender_id: string; read_at: string | null }[] }),
  ]);

  const profileMap = new Map<string, ProfileLite>();
  for (const p of (profilesRes.data ?? []) as ProfileLite[]) {
    profileMap.set(p.id, p);
  }
  const lastMsgByThread = new Map<string, MessageRow>();
  for (const m of (lastMsgRes.data ?? []) as MessageRow[]) {
    if (!lastMsgByThread.has(m.thread_id)) {
      lastMsgByThread.set(m.thread_id, m);
    }
  }
  const unreadByThread = new Map<string, number>();
  for (const u of (unreadRes.data ?? []) as { thread_id: string; sender_id: string }[]) {
    if (u.sender_id === user.id) continue;
    unreadByThread.set(u.thread_id, (unreadByThread.get(u.thread_id) ?? 0) + 1);
  }

  const enriched: DmThreadWithPeer[] = threads.map((t) => {
    const otherId = t.user_a_id === user.id ? t.user_b_id : t.user_a_id;
    const peer: ProfileLite = profileMap.get(otherId) ?? {
      id: otherId,
      handle: '未知',
      display_name: '未知用户',
      avatar_url: null,
    };
    const last = lastMsgByThread.get(t.id);
    return {
      ...t,
      other_user: peer,
      last_message_preview: last?.body ?? null,
      unread_count: unreadByThread.get(t.id) ?? 0,
    };
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">消息</h1>
        <Link href="/feed" className="text-sm text-muted-foreground hover:text-foreground">
          返回首页
        </Link>
      </div>
      <DmList threads={enriched} />
    </div>
  );
}
