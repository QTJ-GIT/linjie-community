'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function setAcceptedAnswer(params: {
  postId: string;
  commentId: string;
}): Promise<ActionResult> {
  const { postId, commentId } = params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  // Verify viewer is post author and post.type = question
  const { data: post, error: postErr } = await supabase
    .from('posts')
    .select('id, author_id, type, section_slug')
    .eq('id', postId)
    .maybeSingle();
  if (postErr || !post) return { ok: false, error: postErr?.message ?? '帖子不存在' };
  if (post.author_id !== user.id) return { ok: false, error: '只有作者可以标记答案' };
  if (post.type !== 'question') return { ok: false, error: '仅问题帖可标记答案' };

  // Verify comment belongs to post
  const { data: comment, error: cErr } = await supabase
    .from('comments')
    .select('id, post_id')
    .eq('id', commentId)
    .maybeSingle();
  if (cErr || !comment) return { ok: false, error: cErr?.message ?? '评论不存在' };
  if (comment.post_id !== postId) return { ok: false, error: '评论不属于该帖子' };

  const { error } = await supabase
    .from('posts')
    .update({ accepted_answer_id: commentId, updated_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('author_id', user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/posts/${postId}`);
  return { ok: true };
}
