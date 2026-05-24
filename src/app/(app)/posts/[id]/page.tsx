import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronRight, Pencil } from 'lucide-react';
import { PostDeleteButton } from '@/components/posts/PostDeleteButton';
import { createClient } from '@/lib/supabase/server';
import { SITE } from '@/lib/site';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PostBody } from '@/components/posts/PostBody';
import { PostComments, PostCommentsSkeleton } from '@/components/posts/PostComments';
import { CommentForm } from '@/components/posts/CommentForm';
import { VoteButtons } from '@/components/posts/VoteButtons';
import { SentimentBadge } from '@/components/posts/SentimentBadge';
import { BookmarkButton } from '@/components/posts/BookmarkButton';
import { ShareMenu } from '@/components/posts/ShareMenu';
import { ReactionBarServer } from '@/components/reactions/ReactionBarServer';
import { PollSection } from '@/components/polls/PollSection';
import { SmartTime } from '@/components/smart-time';
import type { PostSentiment, Profile } from '@/types/domain';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const supabase = createClient();
  // 无效的 UUID 格式直接 404
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.id)) {
    return { title: `帖子 · ${SITE.name}` };
  }

  const { data: post } = await supabase
    .from('posts')
    .select('title, body_text, is_deleted, created_at, updated_at')
    .eq('id', params.id)
    .maybeSingle();

  if (!post || (post as { is_deleted?: boolean }).is_deleted) {
    return { title: `帖子 · ${SITE.name}` };
  }

  const row = post as {
    title: string;
    body_text: string | null;
    created_at: string;
    updated_at: string;
  };
  const title = `${row.title} · ${SITE.name}`;
  const description =
    (row.body_text ?? '').replace(/\s+/g, ' ').trim().slice(0, 160) || SITE.description;
  const url = `${SITE.url}/posts/${params.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: row.title,
      description,
      url,
      type: 'article',
      siteName: SITE.name,
      locale: SITE.locale,
      publishedTime: row.created_at,
      modifiedTime: row.updated_at,
    },
    twitter: {
      card: 'summary_large_image',
      title: row.title,
      description,
    },
  };
}

const SECTION_LABELS: Record<string, string> = {
  general: '综合讨论',
  qa: '问答',
  stocks: '股票话题',
};

type AuthorLite = Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;

function pickAuthor(raw: unknown): AuthorLite {
  if (Array.isArray(raw)) return (raw[0] as AuthorLite) ?? fallback();
  if (raw && typeof raw === 'object') return raw as AuthorLite;
  return fallback();
}
function fallback(): AuthorLite {
  return { id: '', handle: 'unknown', display_name: '未知用户', avatar_url: null };
}

export default async function PostDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 无效的 UUID 格式直接 404
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.id)) notFound();

  const { data: post, error } = await supabase
    .from('posts')
    .select(
      `id, author_id, section_slug, type, title, body_json, body_text,
       accepted_answer_id, is_deleted, created_at, updated_at, score, sentiment,
       author:profiles!posts_author_id_fkey ( id, handle, display_name, avatar_url ),
       post_tickers ( symbol )`
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error || !post || post.is_deleted) notFound();

  const author = pickAuthor(post.author);
  const tickers = (post.post_tickers as { symbol: string }[] | null)?.map((t) => t.symbol) ?? [];
  const postScore = (post.score as number | undefined) ?? 0;
  const postSentiment = (post.sentiment as PostSentiment | null | undefined) ?? null;
  const sectionLabel = SECTION_LABELS[post.section_slug] ?? post.section_slug;

  // Viewer-specific flags
  const [postVoteRes, bookmarkedRes] = await Promise.all([
    user
      ? supabase
          .from('likes')
          .select('value')
          .eq('user_id', user.id)
          .eq('post_id', post.id)
          .is('comment_id', null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase
          .from('bookmarks')
          .select('user_id')
          .eq('user_id', user.id)
          .eq('post_id', post.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const postMyVote: 1 | -1 | 0 = ((postVoteRes.data as { value?: number } | null)?.value ??
    0) as 1 | -1 | 0;
  const postBookmarked = Boolean(bookmarkedRes.data);

  const isViewerAuthor = user?.id === post.author_id;

  // Check admin status
  const { data: isAdmin } = user
    ? await supabase.rpc('is_admin')
    : { data: false };

  const initials = (author.display_name ?? author.handle ?? '?').slice(0, 1);

  return (
    <div className="mx-auto w-full max-w-[740px] space-y-8 p-4 sm:p-6">
      <article className="space-y-6">
        {/* Breadcrumb */}
        <nav
          aria-label="面包屑"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link href="/feed" className="hover:text-foreground">
            首页
          </Link>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <Link
            href={`/s/${post.section_slug}`}
            className="hover:text-foreground"
          >
            {sectionLabel}
          </Link>
          <ChevronRight className="h-3 w-3 opacity-60" />
          <span className="truncate text-foreground/70">帖子</span>
        </nav>

        <header className="space-y-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {sectionLabel}
            </span>
            {post.type === 'question' ? (
              <Badge
                variant={post.accepted_answer_id ? 'default' : 'outline'}
                className="h-5 px-1.5 py-0 text-[10px]"
              >
                {post.accepted_answer_id ? '已解决' : '问题'}
              </Badge>
            ) : null}
            {postSentiment ? <SentimentBadge sentiment={postSentiment} /> : null}
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <SmartTime iso={post.created_at} className="font-mono text-[11px]" />
          </div>

          {/* 标题 —— display 字号 */}
          <h1 className="text-h1 font-bold leading-[1.15] tracking-tight sm:text-display sm:leading-[1.1]">
            {post.title}
          </h1>

          {/* Author 横向小卡 */}
          <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/50 px-4 py-3">
            <Link href={`/profile/${author.handle}`} className="shrink-0">
              <Avatar className="h-10 w-10 ring-2 ring-[hsl(var(--brand-500))]/15">
                {author.avatar_url ? (
                  <AvatarImage src={author.avatar_url} alt={author.display_name} />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/profile/${author.handle}`}
                className="block text-sm font-medium hover:text-[hsl(var(--brand-600))] dark:hover:text-[hsl(var(--brand-400))]"
              >
                {author.display_name}
              </Link>
              <div className="font-mono text-[11px] text-muted-foreground">
                @{author.handle}
              </div>
            </div>
            {isViewerAuthor || isAdmin ? (
              <div className="flex items-center gap-1">
                {isViewerAuthor ? (
                  <Button asChild variant="ghost" size="sm" className="gap-1">
                    <Link href={`/posts/${post.id}/edit`}>
                      <Pencil className="h-4 w-4" />
                      编辑
                    </Link>
                  </Button>
                ) : null}
                <PostDeleteButton
                  postId={post.id}
                  isAuthor={isViewerAuthor}
                  isAdmin={!!isAdmin}
                />
              </div>
            ) : null}
          </div>

          {tickers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tickers.map((t) => (
                <Link
                  key={t}
                  href={`/tickers/${t}`}
                  className="inline-flex items-center rounded-md border border-emerald-500/25 bg-emerald-500/8 px-2 py-0.5 font-mono text-[12px] font-semibold text-emerald-700 hover:bg-emerald-500/15 dark:border-emerald-400/30 dark:text-emerald-300 dark:hover:bg-emerald-400/15"
                >
                  ${t}
                </Link>
              ))}
            </div>
          ) : null}
        </header>

        <Separator className="bg-border/60" />

        <div className="prose-post">
          <PostBody doc={post.body_json} />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <VoteButtons
            targetType="post"
            targetId={post.id}
            initialScore={postScore}
            initialMyVote={postMyVote}
            size="default"
            orientation="horizontal"
          />
          {user ? (
            <BookmarkButton postId={post.id} initiallyBookmarked={postBookmarked} />
          ) : null}
          <ShareMenu postId={post.id} title={post.title} />
        </div>

        <ReactionBarServer targetType="post" targetId={post.id} />

        <PollSection postId={post.id} isAuthor={isViewerAuthor} />
      </article>

      <Separator className="bg-border/60" />

      <section className="space-y-5">
        <h2 className="text-h3 font-semibold tracking-tight">评论</h2>
        <Suspense fallback={<PostCommentsSkeleton />}>
          <PostComments
            postId={post.id}
            isQuestion={post.type === 'question'}
            isPostAuthor={isViewerAuthor}
            acceptedAnswerId={post.accepted_answer_id}
            viewerId={user?.id ?? null}
          />
        </Suspense>
        {user ? (
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <CommentForm postId={post.id} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
              登录
            </Link>{' '}
            后可以发表评论。
          </p>
        )}
      </section>
    </div>
  );
}

// End of post detail page.
