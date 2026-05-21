import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SmartTime } from '@/components/smart-time';
import {
  Users, FileText, Flag, GraduationCap,
  ChevronRight, TrendingUp, MessageSquare,
} from 'lucide-react';
import type { ReportStatus, ReportTargetType } from '@/types/domain';

export const dynamic = 'force-dynamic';

const TARGET_LABEL: Record<ReportTargetType, string> = {
  post: '帖子', comment: '评论', chat_message: '聊天消息', user: '用户',
};

const STATUS_VARIANT: Record<ReportStatus, 'default' | 'secondary' | 'outline'> = {
  pending: 'default', resolved: 'secondary', dismissed: 'outline',
};
const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: '待处理', resolved: '已处理', dismissed: '已忽略',
};

const QUICK_ACTIONS = [
  { href: '/admin/teaching/new', label: '发布教学内容', icon: GraduationCap, color: 'text-blue-500' },
  { href: '/admin/reports', label: '处理举报队列', icon: Flag, color: 'text-rose-500' },
  { href: '/admin/users', label: '管理用户', icon: Users, color: 'text-violet-500' },
  { href: '/admin/posts', label: '管理帖子', icon: FileText, color: 'text-amber-500' },
];

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: pendingCountRow },
    { count: totalUsers },
    { count: totalPosts },
    { count: recentPosts },
    { count: teachingCount },
    { count: totalComments },
    { data: recentReports },
  ] = await Promise.all([
    supabase.from('report_pending_count').select('pending').maybeSingle(),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo).eq('is_deleted', false),
    supabase.from('teaching_resources').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('comments').select('id', { count: 'exact', head: true }).eq('is_deleted', false),
    supabase.from('reports').select('id, target_type, reason, status, created_at').order('created_at', { ascending: false }).limit(8),
  ]);

  const pendingReports = (pendingCountRow as { pending?: number } | null)?.pending ?? 0;

  return (
    <div className="space-y-6">
      {/* 数据概览 */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">数据概览</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="注册用户" value={totalUsers ?? 0} icon={Users} href="/admin/users" color="text-violet-500" />
          <StatCard label="帖子总量" value={totalPosts ?? 0} icon={FileText} href="/admin/posts" color="text-amber-500" />
          <StatCard label="近 7 天新帖" value={recentPosts ?? 0} icon={TrendingUp} href="/admin/posts" color="text-green-500" />
          <StatCard label="评论总量" value={totalComments ?? 0} icon={MessageSquare} href="/admin/posts" color="text-sky-500" />
          <StatCard label="教学内容" value={teachingCount ?? 0} icon={GraduationCap} href="/admin/teaching" color="text-blue-500" />
          <StatCard label="待处理举报" value={pendingReports} icon={Flag} href="/admin/reports" color="text-rose-500" urgent={pendingReports > 0} />
        </div>
      </section>

      {/* 快捷操作 */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">快捷操作</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ACTIONS.map((a) => (
            <Link key={a.href} href={a.href}>
              <Card className="h-full transition-all hover:border-primary/40 hover:shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <a.icon className={`h-5 w-5 shrink-0 ${a.color}`} />
                  <span className="text-sm font-medium">{a.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* 最新举报 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">最新举报</h2>
          <Link href="/admin/reports" className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            查看全部 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <Card>
          <CardContent className="p-0">
            {!recentReports || recentReports.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">暂无举报</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {recentReports.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex flex-1 items-start gap-3 min-w-0">
                      <div className="flex shrink-0 flex-col gap-1 pt-0.5">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {TARGET_LABEL[r.target_type as ReportTargetType]}
                        </Badge>
                        <Badge variant={STATUS_VARIANT[r.status as ReportStatus]} className="text-[10px] px-1.5 py-0">
                          {STATUS_LABEL[r.status as ReportStatus]}
                        </Badge>
                      </div>
                      <p className="min-w-0 flex-1 truncate text-sm">{r.reason}</p>
                    </div>
                    <SmartTime iso={r.created_at} className="shrink-0 font-mono text-[10px] text-muted-foreground" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, href, color, urgent,
}: {
  label: string; value: number; icon: React.ElementType;
  href: string; color: string; urgent?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className={`h-full transition-all hover:border-primary/40 hover:shadow-sm ${urgent ? 'border-rose-500/40 bg-rose-500/5' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{label}</span>
            <Icon className={`h-3.5 w-3.5 ${color}`} />
          </div>
          <div className={`mt-1.5 text-2xl font-bold ${urgent ? 'text-rose-500' : ''}`}>{value}</div>
        </CardContent>
      </Card>
    </Link>
  );
}
