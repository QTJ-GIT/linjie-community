'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: '请先登录' };
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: '无权限' };
  return { ok: true as const, supabase, user };
}

export async function resolveReport(
  id: string,
  action: 'resolve' | 'dismiss'
): Promise<ActionResult> {
  if (action !== 'resolve' && action !== 'dismiss') {
    return { ok: false, error: '无效操作' };
  }
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const status = action === 'resolve' ? 'resolved' : 'dismissed';
  const { error } = await guard.supabase
    .from('reports')
    .update({
      status,
      reviewed_by: guard.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/reports');
  revalidatePath('/admin');
  return { ok: true };
}

export async function pinPost(
  postId: string,
  pinned: boolean
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const { error } = await guard.supabase
    .from('posts')
    .update({ is_pinned: pinned, updated_at: new Date().toISOString() })
    .eq('id', postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/posts');
  revalidatePath('/feed');
  revalidatePath(`/posts/${postId}`);
  return { ok: true };
}

export async function softDeletePost(postId: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const { error } = await guard.supabase
    .from('posts')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/posts');
  revalidatePath('/feed');
  revalidatePath(`/posts/${postId}`);
  return { ok: true };
}

export async function softDeleteComment(
  commentId: string
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const { error } = await guard.supabase
    .from('comments')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', commentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/reports');
  return { ok: true };
}

export async function toggleUserAdmin(
  userId: string,
  isAdmin: boolean
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const { error } = await guard.supabase
    .from('profiles')
    .update({ is_admin: isAdmin, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/users');
  revalidatePath(`/admin/users`);
  return { ok: true };
}

export async function softDeleteUserContent(
  userId: string
): Promise<ActionResult<{ posts: number; comments: number }>> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: guard.error };

  const now = new Date().toISOString();

  // 先获取要删除的数量
  const [{ count: postsCount }, { count: commentsCount }] = await Promise.all([
    guard.supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', userId)
      .eq('is_deleted', false),
    guard.supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', userId)
      .eq('is_deleted', false),
  ]);

  const [{ error: postsError }, { error: commentsError }] = await Promise.all([
    guard.supabase
      .from('posts')
      .update({ is_deleted: true, updated_at: now })
      .eq('author_id', userId)
      .eq('is_deleted', false),
    guard.supabase
      .from('comments')
      .update({ is_deleted: true, updated_at: now })
      .eq('author_id', userId)
      .eq('is_deleted', false),
  ]);

  if (postsError) return { ok: false, error: postsError.message };
  if (commentsError) return { ok: false, error: commentsError.message };

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath('/admin/posts');
  revalidatePath('/feed');

  return {
    ok: true,
    data: {
      posts: postsCount ?? 0,
      comments: commentsCount ?? 0,
    },
  };
}
