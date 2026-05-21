'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const sendDmSchema = z.object({
  threadId: z.string().uuid('会话 ID 不合法'),
  body: z
    .string()
    .trim()
    .min(1, '消息不能为空')
    .max(4000, '消息最多 4000 字'),
});

export async function openThreadWith(otherUserId: string): Promise<void> {
  if (!otherUserId) {
    redirect('/messages');
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=/messages`);
  }
  if (user.id === otherUserId) {
    redirect('/messages');
  }

  const { data, error } = await supabase.rpc('dm_get_or_create_thread', {
    other_user: otherUserId,
  });
  if (error || !data) {
    redirect('/messages');
  }
  revalidatePath('/messages');
  redirect(`/messages/${data as string}`);
}

export async function sendDm(
  threadId: string,
  body: string
): Promise<ActionResult<{ id: string }>> {
  const parsed = sendDmSchema.safeParse({ threadId, body });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '参数不合法' };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data: thread, error: threadErr } = await supabase
    .from('dm_threads')
    .select('id, user_a_id, user_b_id')
    .eq('id', parsed.data.threadId)
    .maybeSingle();
  if (threadErr) return { ok: false, error: threadErr.message };
  if (!thread) return { ok: false, error: '会话不存在' };
  if (thread.user_a_id !== user.id && thread.user_b_id !== user.id) {
    return { ok: false, error: '无权发送消息' };
  }

  const { data, error } = await supabase
    .from('dm_messages')
    .insert({
      thread_id: parsed.data.threadId,
      sender_id: user.id,
      body: parsed.data.body,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/messages/${parsed.data.threadId}`);
  revalidatePath('/messages');
  return { ok: true, data: { id: data.id as string } };
}

export async function markThreadRead(threadId: string): Promise<ActionResult> {
  if (!threadId) return { ok: false, error: '参数缺失' };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { error } = await supabase
    .from('dm_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('thread_id', threadId)
    .neq('sender_id', user.id)
    .is('read_at', null);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/messages');
  revalidatePath(`/messages/${threadId}`);
  return { ok: true };
}
