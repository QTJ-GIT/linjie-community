'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  profileUpdateSchema,
  type ProfileUpdateInput,
} from '@/lib/validators/profile';

export type UpdateProfileResult =
  | { ok: true; handle: string }
  | { ok: false; error: string };

export async function updateProfile(
  input: ProfileUpdateInput
): Promise<UpdateProfileResult> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? '表单内容不合法' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: '未登录' };
  }

  const payload = {
    handle: parsed.data.handle,
    display_name: parsed.data.display_name,
    bio: parsed.data.bio ?? null,
    avatar_url: parsed.data.avatar_url ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', user.id);

  if (error) {
    // Postgres unique_violation
    if (error.code === '23505') {
      return { ok: false, error: '该用户名已被占用，请换一个' };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath('/profile');
  revalidatePath(`/profile/${parsed.data.handle}`);

  return { ok: true, handle: parsed.data.handle };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}
