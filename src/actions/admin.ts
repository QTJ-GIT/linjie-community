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
  const supabase = createClient();
  const { error } = await supabase.rpc('delete_post', { post_id: postId });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/posts');
  revalidatePath('/feed');
  revalidatePath(`/posts/${postId}`);
  return { ok: true };
}

export async function softDeleteComment(
  commentId: string
): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc('delete_comment', { comment_id: commentId });
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
  const supabase = createClient();
  const { data, error } = await supabase.rpc('admin_delete_user_content', {
    target_user_id: userId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath('/admin/posts');
  revalidatePath('/feed');

  return {
    ok: true,
    data: {
      posts: data?.[0]?.posts_count ?? 0,
      comments: data?.[0]?.comments_count ?? 0,
    },
  };
}
