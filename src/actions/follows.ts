'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type FollowResult =
  | { ok: true; following: boolean }
  | { ok: false; error: string };

export async function toggleFollowUser(targetUserId: string): Promise<FollowResult> {
  if (!targetUserId) return { ok: false, error: '参数缺失' };
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };
  if (user.id === targetUserId) return { ok: false, error: '不能关注自己' };

  const { data: existing, error: existingErr } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle();
  if (existingErr) return { ok: false, error: existingErr.message };

  let following: boolean;
  if (existing) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId);
    if (error) return { ok: false, error: error.message };
    following = false;
  } else {
    const { error } = await supabase.from('follows').insert({
      follower_id: user.id,
      following_id: targetUserId,
    });
    if (error) return { ok: false, error: error.message };
    following = true;
  }

  revalidatePath('/following');
  revalidatePath(`/profile/${targetUserId}`);
  return { ok: true, following };
}

export async function toggleFollowTicker(symbol: string): Promise<FollowResult> {
  if (!symbol) return { ok: false, error: '参数缺失' };
  const normalized = symbol.trim().toUpperCase();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data: existing, error: existingErr } = await supabase
    .from('ticker_follows')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('symbol', normalized)
    .maybeSingle();
  if (existingErr) return { ok: false, error: existingErr.message };

  let following: boolean;
  if (existing) {
    const { error } = await supabase
      .from('ticker_follows')
      .delete()
      .eq('user_id', user.id)
      .eq('symbol', normalized);
    if (error) return { ok: false, error: error.message };
    following = false;
  } else {
    const { error } = await supabase.from('ticker_follows').insert({
      user_id: user.id,
      symbol: normalized,
    });
    if (error) return { ok: false, error: error.message };
    following = true;
  }

  revalidatePath(`/tickers/${normalized}`);
  revalidatePath('/tickers');
  return { ok: true, following };
}
