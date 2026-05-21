'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function toggleBookmark(
  postId: string
): Promise<ActionResult<{ bookmarked: boolean }>> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data: existing, error: existingErr } = await supabase
    .from('bookmarks')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle();
  if (existingErr) return { ok: false, error: existingErr.message };

  let bookmarked: boolean;
  if (existing) {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId);
    if (error) return { ok: false, error: error.message };
    bookmarked = false;
  } else {
    const { error } = await supabase.from('bookmarks').insert({
      user_id: user.id,
      post_id: postId,
    });
    if (error) return { ok: false, error: error.message };
    bookmarked = true;
  }

  revalidatePath('/bookmarks');
  revalidatePath(`/posts/${postId}`);
  return { ok: true, data: { bookmarked } };
}
