'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type ReactionTarget = 'post' | 'comment' | 'chat_message';

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const PRESET_EMOJIS = new Set(['👍', '❤️', '🚀', '🐂', '🐻', '🔥', '😂', '💀']);

export async function toggleReaction(params: {
  target_type: ReactionTarget;
  target_id: string;
  emoji: string;
}): Promise<ActionResult<{ reacted: boolean }>> {
  const { target_type, target_id, emoji } = params;

  if (target_type !== 'post' && target_type !== 'comment' && target_type !== 'chat_message') {
    return { ok: false, error: '无效目标' };
  }
  if (!emoji || emoji.length > 16) {
    return { ok: false, error: '无效表情' };
  }
  // Allow custom emoji too, but ensure not empty whitespace
  if (!emoji.trim()) return { ok: false, error: '无效表情' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data: existing, error: selErr } = await supabase
    .from('reactions')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('target_type', target_type)
    .eq('target_id', target_id)
    .eq('emoji', emoji)
    .maybeSingle();

  if (selErr) return { ok: false, error: selErr.message };

  let reacted = false;
  if (existing) {
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('user_id', user.id)
      .eq('target_type', target_type)
      .eq('target_id', target_id)
      .eq('emoji', emoji);
    if (error) return { ok: false, error: error.message };
    reacted = false;
  } else {
    // Only allow emoji from preset list for insert via this action to avoid abuse
    // (custom emoji could still be on chat server-side, but we lock to preset for UI consistency)
    if (!PRESET_EMOJIS.has(emoji)) {
      return { ok: false, error: '请使用预设表情' };
    }
    const { error } = await supabase.from('reactions').insert({
      user_id: user.id,
      target_type,
      target_id,
      emoji,
    });
    if (error) return { ok: false, error: error.message };
    reacted = true;
  }

  if (target_type === 'post') revalidatePath(`/posts/${target_id}`);
  return { ok: true, data: { reacted } };
}
