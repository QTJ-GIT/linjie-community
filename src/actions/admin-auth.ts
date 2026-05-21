'use server';

import { createClient as createServiceClient } from '@supabase/supabase-js';

function getService() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function verifyAdminInviteCode(code: string): Promise<boolean> {
  const valid = process.env.ADMIN_INVITE_CODE;
  if (!valid) return false;
  return code.trim() === valid.trim();
}

// 用邮箱 + 邀请码做管理员预授权：
// 验证邀请码 → 确认邮箱 → 设置 is_admin = true
// 在客户端 signInWithPassword 之前调用，不依赖 cookie
export async function prepareAdminAccount(
  code: string,
  email: string
): Promise<{ ok: boolean; error?: string }> {
  const valid = process.env.ADMIN_INVITE_CODE;
  if (!valid || code.trim() !== valid.trim()) {
    return { ok: false, error: '邀请码无效' };
  }
  if (!email.trim()) {
    return { ok: false, error: '邮箱不能为空' };
  }

  const service = getService();

  // 通过邮箱查找用户
  const { data: listData, error: listError } = await service.auth.admin.listUsers();
  if (listError) {
    return { ok: false, error: '查询用户失败' };
  }

  const authUser = listData.users.find(
    (u) => u.email?.toLowerCase() === email.trim().toLowerCase()
  );
  if (!authUser) {
    return { ok: false, error: '该邮箱尚未注册，请先注册账号' };
  }

  // 确认邮箱（如未确认）
  if (!authUser.email_confirmed_at) {
    const { error: confirmError } = await service.auth.admin.updateUserById(
      authUser.id,
      { email_confirm: true }
    );
    if (confirmError) {
      return { ok: false, error: '邮箱确认失败' };
    }
  }

  // 设置 is_admin = true
  const { error: updateError } = await service
    .from('profiles')
    .update({ is_admin: true })
    .eq('id', authUser.id);

  if (updateError) {
    return { ok: false, error: '管理员授权失败：' + updateError.message };
  }

  return { ok: true };
}
