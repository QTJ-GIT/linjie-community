'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { commentCreateSchema, type CommentCreateInput } from '@/lib/validators/comment';

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function createComment(
  input: CommentCreateInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = commentCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '输入无效' };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { post_id, parent_id, body_json, body_text } = parsed.data;

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id,
      parent_id: parent_id ?? null,
      author_id: user.id,
      body_json,
      body_text,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/posts/${post_id}`);
  return { ok: true, data: { id: data.id } };
}

export async function deleteComment(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data: existing, error: fetchErr } = await supabase
    .from('comments')
    .select('id, post_id, author_id')
    .eq('id', id)
    .single();
  if (fetchErr || !existing) return { ok: false, error: fetchErr?.message ?? '评论不存在' };
  if (existing.author_id !== user.id) return { ok: false, error: '无权删除' };

  const { error } = await supabase
    .from('comments')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/posts/${existing.post_id}`);
  return { ok: true };
}
