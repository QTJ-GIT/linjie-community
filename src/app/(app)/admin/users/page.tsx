import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

type SearchParams = { page?: string };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = createClient();

  const { data: karmaRows, count } = await supabase
    .from('user_karma')
    .select('user_id, karma', { count: 'exact' })
    .order('karma', { ascending: false })
    .range(from, to);

  const userIds = (karmaRows ?? []).map(
    (r) => (r as { user_id: string }).user_id
  );

  const [{ data: profiles }, { data: posts }] = await Promise.all([
    userIds.length
      ? supabase
          .from('profiles')
          .select('id, handle, display_name, avatar_url, is_admin, created_at')
          .in('id', userIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            handle: string;
            display_name: string;
            avatar_url: string | null;
            is_admin: boolean;
            created_at: string;
          }>,
        }),
    userIds.length
      ? supabase
          .from('posts')
          .select('author_id')
          .eq('is_deleted', false)
          .in('author_id', userIds)
      : Promise.resolve({ data: [] as { author_id: string }[] }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const postCountMap = new Map<string, number>();
  for (const p of posts ?? []) {
    postCountMap.set(p.author_id, (postCountMap.get(p.author_id) ?? 0) + 1);
  }

  const rows = (karmaRows ?? []).map((r) => {
    const k = r as { user_id: string; karma: number };
    const prof = profileMap.get(k.user_id);
    return {
      ...k,
      profile: prof,
      post_count: postCountMap.get(k.user_id) ?? 0,
    };
  });

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">用户管理</h2>
          <p className="text-xs text-muted-foreground">
            按声望排序，共 {count ?? 0} 位用户
          </p>
        </div>
        <ul className="divide-y">
          {rows.map((r) => {
            const p = r.profile;
            if (!p) return null;
            const initials = (p.display_name ?? p.handle ?? '?').slice(0, 1);
            return (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <Avatar className="h-9 w-9">
                  {p.avatar_url ? (
                    <AvatarImage src={p.avatar_url} alt={p.display_name} />
                  ) : null}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/users/${p.handle}`}
                      className="font-medium hover:underline"
                    >
                      {p.display_name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      @{p.handle}
                    </span>
                    {p.is_admin ? (
                      <Badge variant="default" className="text-[10px]">
                        管理员
                      </Badge>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    声望 {r.karma} · 帖子 {r.post_count}
                  </div>
                </div>
                <Link
                  href={`/admin/users/${p.handle}`}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  详情 →
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs">
          <span className="text-muted-foreground">
            第 {page} / {totalPages} 页
          </span>
          <div className="flex gap-1">
            {page > 1 ? (
              <Link
                href={`/admin/users?page=${page - 1}`}
                className="rounded-md px-2 py-1 hover:bg-accent/60"
              >
                上一页
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={`/admin/users?page=${page + 1}`}
                className="rounded-md px-2 py-1 hover:bg-accent/60"
              >
                下一页
              </Link>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
