import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronRight, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { SITE } from '@/lib/site';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PostBody } from '@/components/posts/PostBody';
import { SmartTime } from '@/components/smart-time';
import { TeachingActionBar } from '@/components/teaching/TeachingActionBar';
import { TeachingComments } from '@/components/teaching/TeachingComments';
import { incrementTeachingViewCount } from '@/actions/teaching';
import type { TeachingResourceWithAuthor, Profile } from '@/types/domain';

export const dynamic = 'force-dynamic';

function pickAuthor(raw: unknown): Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'> {
  if (Array.isArray(raw)) return raw[0] ?? fallback();
  if (raw && typeof raw === 'object') return raw as Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;
  return fallback();
}
function fallback() {
  return { id: '', handle: 'unknown', display_name: '未知用户', avatar_url: null };
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from('teaching_resources')
    .select('title, description, category')
    .eq('id', params.id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!data) return { title: `教学内容 · ${SITE.name}` };
  const row = data as { title: string; description: string | null };
  return {
    title: `${row.title} · ${SITE.name}`,
    description: row.description ?? undefined,
  };
}

export default async function TeachingDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('teaching_resources')
    .select(
      `id, type, title, description, video_url, embed_url, thumbnail_url,
       body_json, body_text, cover_image_url, category, view_count, created_at, author_id,
       author:profiles!teaching_resources_author_id_fkey ( id, handle, display_name, avatar_url )`
    )
    .eq('id', params.id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (error || !data) notFound();

  const resource = data as unknown as TeachingResourceWithAuthor;
  const author = pickAuthor(resource.author);
  const initials = (author.display_name ?? author.handle ?? '?').slice(0, 1);

  // 并发获取社交数据
  const [likeCountRes, userLikeRes, userBookmarkRes, commentsRes] = await Promise.all([
    supabase.from('teaching_likes').select('*', { count: 'exact', head: true }).eq('resource_id', params.id),
    user
      ? supabase.from('teaching_likes').select('user_id').eq('user_id', user.id).eq('resource_id', params.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('teaching_bookmarks').select('user_id').eq('user_id', user.id).eq('resource_id', params.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('teaching_comments')
      .select(`id, author_id, body_text, created_at, author:profiles!teaching_comments_author_id_fkey ( id, handle, display_name, avatar_url )`)
      .eq('resource_id', params.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true }),
  ]);

  const likeCount = likeCountRes.count ?? 0;
  const isLiked = !!userLikeRes.data;
  const isBookmarked = !!userBookmarkRes.data;
  const comments = (commentsRes.data ?? []) as unknown as {
    id: string; author_id: string; body_text: string; created_at: string;
    author: { id: string; handle: string; display_name: string | null; avatar_url: string | null } | null;
  }[];

  // 浏览量（fire-and-forget，不阻塞渲染）
  incrementTeachingViewCount(params.id).catch(() => {});

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
        <Link href="/teaching" className="hover:text-foreground">教学大厅</Link>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="truncate text-foreground/70">{resource.title}</span>
      </nav>

      <article>
        {/* 标题 */}
        <h1 className="text-2xl font-bold leading-snug sm:text-3xl">{resource.title}</h1>

        {/* 元信息行 */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <Badge variant={resource.type === 'video' ? 'default' : 'secondary'} className="text-[11px]">
            {resource.type === 'video' ? '视频' : '文章'}
          </Badge>
          {resource.category ? (
            <Badge variant="outline" className="text-[11px]">
              {resource.category}
            </Badge>
          ) : null}
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" /> {resource.view_count} 次浏览
          </span>
          <SmartTime iso={resource.created_at} className="font-mono text-[10px]" />
        </div>

        {/* 作者卡片（微信风格：头像 + 名称，紧凑） */}
        <div className="mt-4 flex items-center gap-3 border-b border-border/40 pb-4">
          <Link href={`/profile/${author.handle}`} className="shrink-0">
            <Avatar className="h-8 w-8">
              {author.avatar_url ? (
                <AvatarImage src={author.avatar_url} alt={author.display_name ?? author.handle} />
              ) : (
                <AvatarFallback>{initials}</AvatarFallback>
              )}
            </Avatar>
          </Link>
          <div>
            <Link href={`/profile/${author.handle}`} className="text-sm font-medium hover:underline">
              {author.display_name ?? author.handle}
            </Link>
            <div className="font-mono text-[10px] text-muted-foreground">@{author.handle}</div>
          </div>
        </div>

        {/* 简介 */}
        {resource.description ? (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{resource.description}</p>
        ) : null}

        {/* 主体内容 */}
        <div className="mt-6">
          {resource.type === 'video' ? (
            <div className="overflow-hidden rounded-xl border border-border/60 bg-black">
              {resource.video_url ? (
                <video
                  src={resource.video_url}
                  controls
                  className="w-full"
                  poster={resource.thumbnail_url ?? resource.cover_image_url ?? undefined}
                />
              ) : resource.embed_url ? (
                <div className="relative aspect-video w-full">
                  <iframe
                    src={resource.embed_url}
                    className="absolute inset-0 h-full w-full"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    frameBorder="0"
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="prose-post">
              {resource.body_json ? (
                <PostBody doc={resource.body_json} />
              ) : (
                <p className="text-muted-foreground">{resource.body_text}</p>
              )}
            </div>
          )}
        </div>

        {/* 点赞 / 收藏 / 分享 操作栏 */}
        <TeachingActionBar
          resourceId={params.id}
          initialLiked={isLiked}
          initialLikeCount={likeCount}
          initialBookmarked={isBookmarked}
          isLoggedIn={!!user}
        />

        {/* 评论区 */}
        <TeachingComments
          resourceId={params.id}
          comments={comments}
          currentUserId={user?.id}
        />
      </article>
    </div>
  );
}
