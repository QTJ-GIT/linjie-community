'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type VoteTarget = 'post' | 'comment';
export type VoteValue = -1 | 0 | 1;

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function voteOn(params: {
  target_type: VoteTarget;
  target_id: string;
  value: VoteValue;
}): Promise<ActionResult<{ value: VoteValue; score: number }>> {
  const { target_type, target_id, value } = params;

  if (target_type !== 'post' && target_type !== 'comment') {
    return { ok: false, error: '无效目标' };
  }
  if (value !== -1 && value !== 0 && value !== 1) {
    return { ok: false, error: '无效投票值' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const postId = target_type === 'post' ? target_id : null;
  const commentId = target_type === 'comment' ? target_id : null;

  // Find existing vote row
  let existingQuery = supabase
    .from('likes')
    .select('user_id, value')
    .eq('user_id', user.id);
  if (postId)
    existingQuery = existingQuery.eq('post_id', postId).is('comment_id', null);
  else
    existingQuery = existingQuery
      .eq('comment_id', commentId as string)
      .is('post_id', null);

  const { data: existing, error: existingErr } = await existingQuery.maybeSingle();
  if (existingErr) return { ok: false, error: existingErr.message };

  if (value === 0) {
    // un-vote: delete row if present
    if (existing) {
      let del = supabase.from('likes').delete().eq('user_id', user.id);
      if (postId) del = del.eq('post_id', postId).is('comment_id', null);
      else
        del = del
          .eq('comment_id', commentId as string)
          .is('post_id', null);
      const { error } = await del;
      if (error) return { ok: false, error: error.message };
    }
  } else if (!existing) {
    // new vote
    const { error } = await supabase.from('likes').insert({
      user_id: user.id,
      post_id: postId,
      comment_id: commentId,
      value,
    });
    if (error) return { ok: false, error: error.message };
  } else if (existing.value !== value) {
    // flip vote
    let upd = supabase
      .from('likes')
      .update({ value })
      .eq('user_id', user.id);
    if (postId) upd = upd.eq('post_id', postId).is('comment_id', null);
    else
      upd = upd.eq('comment_id', commentId as string).is('post_id', null);
    const { error } = await upd;
    if (error) return { ok: false, error: error.message };
  }

  // Read back current score (trigger already updated it)
  let score = 0;
  if (target_type === 'post') {
    const { data: p } = await supabase
      .from('posts')
      .select('score')
      .eq('id', target_id)
      .maybeSingle();
    score = (p?.score as number | undefined) ?? 0;
    revalidatePath(`/posts/${target_id}`);
    revalidatePath('/feed');
  } else {
    const { data: c } = await supabase
      .from('comments')
      .select('score, post_id')
      .eq('id', target_id)
      .maybeSingle();
    score = (c?.score as number | undefined) ?? 0;
    if (c?.post_id) revalidatePath(`/posts/${c.post_id}`);
  }

  return { ok: true, data: { value, score } };
}
