import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SmartTime } from '@/components/smart-time';
import { ReportActions } from '@/components/admin/ReportActions';
import type { ReportStatus, ReportTargetType } from '@/types/domain';

export const dynamic = 'force-dynamic';

const TARGET_LABEL: Record<ReportTargetType, string> = {
  post: '帖子',
  comment: '评论',
  chat_message: '聊天消息',
  user: '用户',
};

const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: '待处理',
  resolved: '已处理',
  dismissed: '已忽略',
};

type SearchParams = { status?: string };

type ReportRow = {
  id: string;
  reporter_id: string | null;
  target_type: ReportTargetType;
  target_id: string;
  reason: string;
  status: ReportStatus;
  reviewed_at: string | null;
  created_at: string;
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const statusFilter = (searchParams?.status ?? 'pending') as ReportStatus | 'all';

  const supabase = createClient();
  let query = supabase
    .from('reports')
    .select(
      'id, reporter_id, target_type, target_id, reason, status, reviewed_at, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(100);
  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }
  const { data: reports, error } = await query;

  const rows = (reports ?? []) as ReportRow[];

  // Collect reporter ids, post ids, comment ids, user target ids, chat message ids
  const reporterIds = Array.from(
    new Set(rows.map((r) => r.reporter_id).filter((v): v is string => !!v))
  );
  const postIds = rows
    .filter((r) => r.target_type === 'post')
    .map((r) => r.target_id);
  const commentIds = rows
    .filter((r) => r.target_type === 'comment')
    .map((r) => r.target_id);
  const userIds = rows
    .filter((r) => r.target_type === 'user')
    .map((r) => r.target_id);
  const chatIds = rows
    .filter((r) => r.target_type === 'chat_message')
    .map((r) => r.target_id);

  const [
    { data: reporters },
    { data: posts },
    { data: comments },
    { data: users },
    { data: chatMsgs },
  ] = await Promise.all([
    reporterIds.length
      ? supabase
          .from('profiles')
          .select('id, handle, display_name')
          .in('id', reporterIds)
      : Promise.resolve({ data: [] as { id: string; handle: string; display_name: string }[] }),
    postIds.length
      ? supabase.from('posts').select('id, title').in('id', postIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    commentIds.length
      ? supabase
          .from('comments')
          .select('id, post_id, body_text')
          .in('id', commentIds)
      : Promise.resolve({
          data: [] as { id: string; post_id: string; body_text: string }[],
        }),
    userIds.length
      ? supabase
          .from('profiles')
          .select('id, handle, display_name')
          .in('id', userIds)
      : Promise.resolve({ data: [] as { id: string; handle: string; display_name: string }[] }),
    chatIds.length
      ? supabase
          .from('chat_messages')
          .select('id, room_slug, body')
          .in('id', chatIds)
      : Promise.resolve({
          data: [] as { id: string; room_slug: string; body: string }[],
        }),
  ]);

  const reporterMap = new Map(
    (reporters ?? []).map((r) => [r.id, r as { handle: string; display_name: string }])
  );
  const postMap = new Map((posts ?? []).map((p) => [p.id, p]));
  const commentMap = new Map((comments ?? []).map((c) => [c.id, c]));
  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const chatMap = new Map((chatMsgs ?? []).map((c) => [c.id, c]));

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <h2 className="text-sm font-semibold">举报队列</h2>
          <div className="ml-auto flex gap-1 text-xs">
            <FilterLink status="pending" active={statusFilter === 'pending'} />
            <FilterLink
              status="resolved"
              active={statusFilter === 'resolved'}
            />
            <FilterLink
              status="dismissed"
              active={statusFilter === 'dismissed'}
            />
            <FilterLink status="all" active={statusFilter === 'all'} />
          </div>
        </div>
        {error ? (
          <p className="p-4 text-sm text-destructive">加载失败：{error.message}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            暂无举报
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => {
              const reporter = r.reporter_id
                ? reporterMap.get(r.reporter_id)
                : null;
              let targetNode: React.ReactNode = null;
              if (r.target_type === 'post') {
                const p = postMap.get(r.target_id);
                targetNode = p ? (
                  <Link
                    href={`/posts/${p.id}`}
                    className="hover:underline"
                    target="_blank"
                  >
                    {p.title || '(无标题)'}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">（帖子已删除）</span>
                );
              } else if (r.target_type === 'comment') {
                const c = commentMap.get(r.target_id);
                targetNode = c ? (
                  <Link
                    href={`/posts/${c.post_id}#comment-${c.id}`}
                    className="hover:underline"
                    target="_blank"
                  >
                    {(c.body_text || '').slice(0, 80) || '(空评论)'}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">（评论已删除）</span>
                );
              } else if (r.target_type === 'user') {
                const u = userMap.get(r.target_id);
                targetNode = u ? (
                  <Link
                    href={`/profile/${u.handle}`}
                    className="hover:underline"
                    target="_blank"
                  >
                    @{u.handle}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">（用户）</span>
                );
              } else if (r.target_type === 'chat_message') {
                const m = chatMap.get(r.target_id);
                targetNode = m ? (
                  <Link
                    href={`/chat/${m.room_slug}`}
                    className="hover:underline"
                    target="_blank"
                  >
                    [{m.room_slug}] {(m.body || '').slice(0, 80)}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">（消息已删除）</span>
                );
              }

              return (
                <li key={r.id} className="flex gap-3 p-4 text-sm">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">
                        {TARGET_LABEL[r.target_type]}
                      </Badge>
                      <Badge
                        variant={
                          r.status === 'pending' ? 'default' : 'secondary'
                        }
                      >
                        {STATUS_LABEL[r.status]}
                      </Badge>
                      <SmartTime iso={r.created_at} />
                      {reporter ? (
                        <span>
                          举报人：
                          <Link
                            href={`/profile/${reporter.handle}`}
                            className="hover:underline"
                          >
                            @{reporter.handle}
                          </Link>
                        </span>
                      ) : (
                        <span>举报人：（匿名）</span>
                      )}
                    </div>
                    <div className="text-sm font-medium">{targetNode}</div>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {r.reason}
                    </p>
                  </div>
                  {r.status === 'pending' ? (
                    <div className="shrink-0">
                      <ReportActions id={r.id} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function FilterLink({
  status,
  active,
}: {
  status: ReportStatus | 'all';
  active: boolean;
}) {
  const label =
    status === 'all' ? '全部' : STATUS_LABEL[status as ReportStatus];
  return (
    <Link
      href={`/admin/reports?status=${status}`}
      className={
        active
          ? 'rounded-md bg-accent px-2 py-1 text-accent-foreground'
          : 'rounded-md px-2 py-1 text-muted-foreground hover:bg-accent/60 hover:text-foreground'
      }
    >
      {label}
    </Link>
  );
}
