'use server';

import { createClient as createServiceClient } from '@supabase/supabase-js';

// 注册并自动确认邮箱（跳过邮件验证流程）
export async function signUpAndConfirm(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    // 重复注册给友好提示
    if (error.message.includes('already') || error.message.includes('exists')) {
      return { ok: false, error: '该邮箱已注册，请直接登录' };
    }
    return { ok: false, error: error.message };
  }

  if (!data.user) {
    return { ok: false, error: '注册失败，请重试' };
  }

  return { ok: true };
}
