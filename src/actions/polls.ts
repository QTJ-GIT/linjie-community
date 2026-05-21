'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function createPollForPost(input: {
  postId: string;
  multiple: boolean;
  closes_at?: string | null;
  options: string[];
}): Promise<ActionResult<{ postId: string }>> {
  const { postId, multiple, closes_at, options } = input;

  if (!postId) return { ok: false, error: '缺少帖子 ID' };
  const cleaned = (options ?? []).map((o) => o.trim()).filter(Boolean);
  if (cleaned.length < 2) return { ok: false, error: '至少需要 2 个选项' };
  if (cleaned.length > 6) return { ok: false, error: '最多支持 6 个选项' };
  if (cleaned.some((o) => o.length > 200)) return { ok: false, error: '选项过长（最多 200 字）' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  // Validate author
  const { data: post, error: postErr } = await supabase
    .from('posts')
    .select('id, author_id')
    .eq('id', postId)
    .maybeSingle();
  if (postErr) return { ok: false, error: postErr.message };
  if (!post) return { ok: false, error: '帖子不存在' };
  if (post.author_id !== user.id) return { ok: false, error: '只有作者可以添加投票' };

  // Check no existing poll
  const { data: existing } = await supabase
    .from('polls')
    .select('post_id')
    .eq('post_id', postId)
    .maybeSingle();
  if (existing) return { ok: false, error: '该帖子已有投票' };

  const { error: pollErr } = await supabase.from('polls').insert({
    post_id: postId,
    multiple,
    closes_at: closes_at ?? null,
  });
  if (pollErr) return { ok: false, error: pollErr.message };

  const rows = cleaned.map((text, idx) => ({ poll_id: postId, idx, text }));
  const { error: optErr } = await supabase.from('poll_options').insert(rows);
  if (optErr) {
    // rollback
    await supabase.from('polls').delete().eq('post_id', postId);
    return { ok: false, error: optErr.message };
  }

  revalidatePath(`/posts/${postId}`);
  return { ok: true, data: { postId } };
}

export async function deletePoll(postId: string): Promise<ActionResult> {
  if (!postId) return { ok: false, error: '缺少帖子 ID' };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data: post } = await supabase
    .from('posts')
    .select('id, author_id')
    .eq('id', postId)
    .maybeSingle();
  if (!post) return { ok: false, error: '帖子不存在' };
  if (post.author_id !== user.id) return { ok: false, error: '只有作者可以删除投票' };

  const { error } = await supabase.from('polls').delete().eq('post_id', postId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/posts/${postId}`);
  return { ok: true };
}

export async function votePoll(input: {
  pollId: string;
  optionId: string;
}): Promise<ActionResult> {
  const { pollId, optionId } = input;
  if (!pollId || !optionId) return { ok: false, error: '参数缺失' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  // Check closing time
  const { data: poll } = await supabase
    .from('polls')
    .select('post_id, closes_at')
    .eq('post_id', pollId)
    .maybeSingle();
  if (!poll) return { ok: false, error: '投票不存在' };
  if (poll.closes_at && new Date(poll.closes_at).getTime() < Date.now()) {
    return { ok: false, error: '投票已结束' };
  }

  const { error } = await supabase.from('poll_votes').insert({
    poll_id: pollId,
    option_id: optionId,
    user_id: user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/posts/${pollId}`);
  return { ok: true };
}

export async function unvotePoll(input: {
  pollId: string;
  optionId: string;
}): Promise<ActionResult> {
  const { pollId, optionId } = input;
  if (!pollId || !optionId) return { ok: false, error: '参数缺失' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { error } = await supabase
    .from('poll_votes')
    .delete()
    .eq('poll_id', pollId)
    .eq('option_id', optionId)
    .eq('user_id', user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/posts/${pollId}`);
  return { ok: true };
}
