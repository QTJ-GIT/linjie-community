import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChevronLeft } from 'lucide-react';
import { AdminNavLink } from '@/components/admin/AdminNav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin-login');

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) redirect('/admin-login');

  return (
    <div className="space-y-4">
      {/* 返回键 */}
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        返回社区
      </Link>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">管理后台</h1>
            <p className="text-xs text-muted-foreground">仅管理员可见</p>
          </div>
        </div>
        <nav className="mt-3 flex flex-wrap gap-1 text-sm">
          <AdminNavLink href="/admin">总览</AdminNavLink>
          <AdminNavLink href="/admin/reports">举报</AdminNavLink>
          <AdminNavLink href="/admin/users">用户</AdminNavLink>
          <AdminNavLink href="/admin/posts">帖子</AdminNavLink>
          <AdminNavLink href="/admin/teaching">教学</AdminNavLink>
        </nav>
      </div>
      <div>{children}</div>
    </div>
  );
}

