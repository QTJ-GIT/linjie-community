import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SmartTime } from '@/components/smart-time';
import { AdminToggle } from '@/components/admin/AdminToggle';
import { UserContentDeleteButton } from '@/components/admin/UserContentDeleteButton';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({
  params,
}: {
  params: { handle: string };
}) {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, handle, display_name, avatar_url, bio, is_admin, created_at')
    .eq('handle', params.handle)
    .maybeSingle();

  if (!profile) notFound();

  const [
    { data: karmaRow },
    { count: postCount },
    { count: commentCount },
    { count: reportsReceived },
    { data: recentPosts },
  ] = await Promise.all([
    supabase
      .from('user_karma')
      .select('karma')
      .eq('user_id', profile.id)
      .maybeSingle(),
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', profile.id)
      .eq('is_deleted', false),
    supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', profile.id)
      .eq('is_deleted', false),
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'user')
      .eq('target_id', profile.id),
    supabase
      .from('posts')
      .select('id, title, created_at, is_deleted, is_pinned')
      .eq('author_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const karma = (karmaRow as { karma?: number } | null)?.karma ?? 0;
  const initials = (profile.display_name ?? profile.handle ?? '?').slice(0, 1);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-start gap-4 p-4">
          <Avatar className="h-16 w-16">
            {profile.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                alt={profile.display_name}
              />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{profile.display_name}</h2>
              <span className="text-sm text-muted-foreground">
                @{profile.handle}
              </span>
              {profile.is_admin ? (
                <Badge variant="default">管理员</Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.bio || '（暂无简介）'}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>声望 {karma}</span>
              <span>帖子 {postCount ?? 0}</span>
              <span>评论 {commentCount ?? 0}</span>
              <span>被举报次数 {reportsReceived ?? 0}</span>
              <span>
                注册于 <SmartTime iso={profile.created_at} />
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <AdminToggle
                userId={profile.id}
                initialIsAdmin={!!profile.is_admin}
              />
              <Link
                href={`/profile/${profile.handle}`}
                className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs hover:bg-accent/60"
                target="_blank"
              >
                查看主页
              </Link>
              <UserContentDeleteButton
                userId={profile.id}
                postCount={postCount ?? 0}
                commentCount={commentCount ?? 0}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-2 text-sm font-semibold">最近帖子</h3>
          {!recentPosts || recentPosts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              暂无
            </p>
          ) : (
            <ul className="divide-y">
              {recentPosts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 py-2 text-sm"
                >
                  <Link
                    href={`/posts/${p.id}`}
                    className="min-w-0 flex-1 truncate hover:underline"
                    target="_blank"
                  >
                    {p.title || '(无标题)'}
                  </Link>
                  {p.is_pinned ? (
                    <Badge variant="outline" className="text-[10px]">
                      置顶
                    </Badge>
                  ) : null}
                  {p.is_deleted ? (
                    <Badge variant="secondary" className="text-[10px]">
                      已删除
                    </Badge>
                  ) : null}
                  <SmartTime
                    iso={p.created_at}
                    className="text-xs text-muted-foreground"
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
