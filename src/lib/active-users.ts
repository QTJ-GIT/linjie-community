import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

export type ActiveUser = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
  last_seen: string;
};

/**
 * 用 service-role admin client：unstable_cache scope 内不能调 cookies()。
 * recently_active_users 视图返回的字段都是公开（id/handle/display_name/avatar_url/last_seen），
 * 不依赖 viewer 身份，绕过 RLS 安全无虞。
 */
export const getActiveUsers = unstable_cache(
  async (limit = 5): Promise<ActiveUser[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('recently_active_users')
      .select('id, handle, display_name, avatar_url, last_seen')
      .limit(limit);
    return (data ?? []) as ActiveUser[];
  },
  ['active-users'],
  { revalidate: 30 }
);
