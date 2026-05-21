import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DmThread } from '@/components/dm/DmThread';
import type { DmMessageWithSender, Profile } from '@/types/domain';

export const dynamic = 'force-dynamic';

type ProfileLite = Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;

type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
  sender: ProfileLite | ProfileLite[] | null;
};

export default async function MessageThreadPage({
  params,
}: {
  params: { threadId: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/messages/${params.threadId}`);
  }

  const { data: thread, error: threadErr } = await supabase
    .from('dm_threads')
    .select('id, user_a_id, user_b_id, last_message_at, created_at')
    .eq('id', params.threadId)
    .maybeSingle();

  if (threadErr) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
        <h1 className="text-xl font-semibold">消息</h1>
        <p className="text-sm text-destructive">加载失败：{threadErr.message}</p>
      </div>
    );
  }
  if (!thread) notFound();
  if (thread.user_a_id !== user.id && thread.user_b_id !== user.id) {
    notFound();
  }

  const otherId = thread.user_a_id === user.id ? thread.user_b_id : thread.user_a_id;

  const [otherProfileRes, messagesRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url')
      .eq('id', otherId)
      .maybeSingle(),
    supabase
      .from('dm_messages')
      .select(
        'id, thread_id, sender_id, body, read_at, created_at, sender:profiles!dm_messages_sender_id_fkey(id, handle, display_name, avatar_url)'
      )
      .eq('thread_id', params.threadId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const otherUser: ProfileLite = (otherProfileRes.data as ProfileLite | null) ?? {
    id: otherId,
    handle: '未知',
    display_name: '未知用户',
    avatar_url: null,
  };

  const rows = ((messagesRes.data ?? []) as MessageRow[]).slice().reverse();
  const messages: DmMessageWithSender[] = rows.map((m) => {
    const senderRaw = m.sender;
    const sender: ProfileLite = Array.isArray(senderRaw)
      ? (senderRaw[0] as ProfileLite)
      : (senderRaw as ProfileLite | null) ??
        (m.sender_id === otherId ? otherUser : { id: m.sender_id, handle: '我', display_name: '我', avatar_url: null });
    return {
      id: m.id,
      thread_id: m.thread_id,
      sender_id: m.sender_id,
      body: m.body,
      read_at: m.read_at,
      created_at: m.created_at,
      sender,
    };
  });

  // Mark unread messages as read on entry (fire-and-forget is fine server-side; awaiting is cheap)
  await supabase
    .from('dm_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('thread_id', params.threadId)
    .neq('sender_id', user.id)
    .is('read_at', null);

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <Link href="/messages" className="text-sm text-muted-foreground hover:text-foreground">
          ← 返回消息列表
        </Link>
      </div>
      <DmThread
        threadId={params.threadId}
        initialMessages={messages}
        currentUserId={user.id}
        otherUser={otherUser}
      />
    </div>
  );
}
