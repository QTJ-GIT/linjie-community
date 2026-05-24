import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SmartTime } from '@/components/smart-time';
import { PostModActions } from '@/components/admin/PostModActions';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  title: string;
  section_slug: string;
  is_pinned: boolean;
  is_deleted: boolean;
  deleted_by: string | null;
  deleted_at: string | null;
  created_at: string;
  author_id: string;
};

export default async function AdminPostsPage() {
  const supabase = createClient();

  const { data: posts } = await supabase
    .from('posts')
    .select(
      'id, title, section_slug, is_pinned, is_deleted, deleted_by, deleted_at, created_at, author_id'
    )
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (posts ?? []) as Row[];
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const deleterIds = Array.from(new Set(rows.filter((r) => r.deleted_by).map((r) => r.deleted_by!)));
  const allProfileIds = Array.from(new Set([...authorIds, ...deleterIds]));

  const { data: profiles } = allProfileIds.length
    ? await supabase
        .from('profiles')
        .select('id, handle, display_name')
        .in('id', allProfileIds)
    : { data: [] as { id: string; handle: string; display_name: string }[] };
  const profileMap = new Map((profiles ?? []).map((a) => [a.id, a]));

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">帖子管理</h2>
          <p className="text-xs text-muted-foreground">
            最近 50 篇。置顶帖优先显示。
          </p>
        </div>
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            暂无帖子
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((p) => {
              const author = profileMap.get(p.author_id);
              const deleter = p.deleted_by ? profileMap.get(p.deleted_by) : null;
              return (
                <li key={p.id} className="flex items-start gap-3 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {p.is_pinned ? (
                        <Badge variant="outline" className="text-[10px]">
                          置顶
                        </Badge>
                      ) : null}
                      {p.is_deleted ? (
                        <Badge variant="destructive" className="text-[10px]">
                          已删除
                        </Badge>
                      ) : null}
                      <Link
                        href={`/posts/${p.id}`}
                        target="_blank"
                        className={p.is_deleted ? 'font-medium text-muted-foreground line-through hover:underline' : 'font-medium hover:underline'}
                      >
                        {p.title || '(无标题)'}
                      </Link>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px]">
                        {p.section_slug}
                      </Badge>
                      {author ? (
                        <Link
                          href={`/admin/users/${author.handle}`}
                          className="hover:underline"
                        >
                          @{author.handle}
                        </Link>
                      ) : null}
                      <SmartTime iso={p.created_at} />
                      {p.is_deleted && deleter ? (
                        <span className="text-destructive">
                          由 @{deleter.handle} 删除
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <PostModActions
                    postId={p.id}
                    isPinned={p.is_pinned}
                    isDeleted={p.is_deleted}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
