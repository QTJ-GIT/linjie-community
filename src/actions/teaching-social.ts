'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ActionResult } from './teaching';

// ── 点赞 ──────────────────────────────────────────────────────────────────

export async function toggleTeachingLike(
  resourceId: string
): Promise<ActionResult<{ liked: boolean; likeCount: number }>> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data: existing } = await supabase
    .from('teaching_likes')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('resource_id', resourceId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('teaching_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('resource_id', resourceId);
  } else {
    await supabase
      .from('teaching_likes')
      .insert({ user_id: user.id, resource_id: resourceId });
  }

  const { count } = await supabase
    .from('teaching_likes')
    .select('*', { count: 'exact', head: true })
    .eq('resource_id', resourceId);

  revalidatePath(`/teaching/${resourceId}`);
  return { ok: true, data: { liked: !existing, likeCount: count ?? 0 } };
}

// ── 收藏 ──────────────────────────────────────────────────────────────────

export async function toggleTeachingBookmark(
  resourceId: string
): Promise<ActionResult<{ bookmarked: boolean }>> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data: existing } = await supabase
    .from('teaching_bookmarks')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('resource_id', resourceId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('teaching_bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('resource_id', resourceId);
  } else {
    await supabase
      .from('teaching_bookmarks')
      .insert({ user_id: user.id, resource_id: resourceId });
  }

  revalidatePath(`/teaching/${resourceId}`);
  return { ok: true, data: { bookmarked: !existing } };
}

// ── 评论 ──────────────────────────────────────────────────────────────────

export async function createTeachingComment(
  resourceId: string,
  bodyText: string
): Promise<ActionResult<{ id: string }>> {
  const trimmed = bodyText.trim();
  if (!trimmed || trimmed.length > 2000) {
    return { ok: false, error: '评论内容需在 1–2000 字之间' };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data, error } = await supabase
    .from('teaching_comments')
    .insert({ resource_id: resourceId, author_id: user.id, body_text: trimmed })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/teaching/${resourceId}`);
  return { ok: true, data: { id: data.id } };
}

export async function deleteTeachingComment(
  commentId: string,
  resourceId: string
): Promise<ActionResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { error } = await supabase
    .from('teaching_comments')
    .update({ is_deleted: true })
    .eq('id', commentId)
    .eq('author_id', user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/teaching/${resourceId}`);
  return { ok: true };
}
