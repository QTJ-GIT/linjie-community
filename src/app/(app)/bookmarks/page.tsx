import { redirect } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PostCard } from '@/components/posts/PostCard';
import { FeedViewToggle, type FeedViewMode } from '@/components/posts/FeedViewToggle';
import { EmptyState } from '@/components/empty-state';
import { cn } from '@/lib/utils';
import type { PostSentiment, PostWithAuthor, SectionSlug } from '@/types/domain';

export const dynamic = 'force-dynamic';

function parseView(v: string | undefined): FeedViewMode {
  return v === 'compact' ? 'compact' : 'card';
}

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  const view = parseView(searchParams?.view);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/bookmarks');

  const { data: bookmarks, error } = await supabase
    .from('bookmarks')
    .select(
      `created_at, post_id,
       post:posts!bookmarks_post_id_fkey (
         id, author_id, section_slug, type, title, body_json, body_text,
         accepted_answer_id, is_deleted, created_at, updated_at, score, sentiment,
         author:profiles!posts_author_id_fkey ( id, handle, display_name, avatar_url ),
         post_tickers ( symbol )
       )`
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 p-4 sm:p-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">我的收藏</h1>
        <p className="text-sm text-destructive">加载失败：{error.message}</p>
      </div>
    );
  }

  type BookmarkRow = {
    post_id: string;
    post: unknown;
  };

  const rows = (bookmarks ?? []) as BookmarkRow[];

  const posts = rows
    .map((b) => {
      const raw = Array.isArray(b.post) ? b.post[0] : b.post;
      if (!raw || typeof raw !== 'object') return null;
      return raw as Record<string, unknown>;
    })
    .filter((p): p is Record<string, unknown> => Boolean(p) && p!.is_deleted !== true);

  const ids = posts.map((p) => p.id as string);

  const [votedRows, commentCounts] = await Promise.all([
    ids.length
      ? supabase
          .from('likes')
          .select('post_id, value')
          .eq('user_id', user.id)
          .in('post_id', ids)
          .is('comment_id', null)
      : Promise.resolve({ data: [] as { post_id: string | null; value: number }[] }),
    ids.length
      ? supabase.from('comments').select('post_id').in('post_id', ids).eq('is_deleted', false)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
  ]);

  const myVoteMap = new Map<string, 1 | -1 | 0>();
  for (const r of (votedRows.data ?? []) as { post_id: string | null; value: number }[]) {
    if (r.post_id) myVoteMap.set(r.post_id, (r.value as 1 | -1 | 0) ?? 0);
  }
  const commentCount = new Map<string, number>();
  for (const r of (commentCounts.data ?? []) as { post_id: string }[]) {
    commentCount.set(r.post_id, (commentCount.get(r.post_id) ?? 0) + 1);
  }

  const enriched: PostWithAuthor[] = posts.map((p) => {
    const authorRaw = p.author as unknown;
    const author = Array.isArray(authorRaw)
      ? (authorRaw[0] as PostWithAuthor['author'])
      : (authorRaw as PostWithAuthor['author']);
    const tickers = (p.post_tickers as { symbol: string }[] | null)?.map((t) => t.symbol) ?? [];
    return {
      id: p.id as string,
      author_id: p.author_id as string,
      section_slug: p.section_slug as SectionSlug,
      type: p.type as 'post' | 'question',
      title: p.title as string,
      body_json: p.body_json as Record<string, unknown>,
      body_text: p.body_text as string,
      accepted_answer_id: (p.accepted_answer_id as string | null) ?? null,
      is_deleted: Boolean(p.is_deleted),
      created_at: p.created_at as string,
      updated_at: p.updated_at as string,
      score: (p.score as number | undefined) ?? 0,
      sentiment: (p.sentiment as PostSentiment | null | undefined) ?? null,
      author,
      tickers,
      comment_count: commentCount.get(p.id as string) ?? 0,
      my_vote: myVoteMap.get(p.id as string) ?? 0,
      bookmarked_by_me: true,
    };
  });

  const total = enriched.length;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-6">
      {/* Hero */}
      <section className="rounded-2xl border border-border/60 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-[hsl(var(--brand-500))]">
              个人书签
            </p>
            <h1 className="mt-1 font-display text-h2 font-semibold tracking-tight">
              我的收藏
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              想之后再看的帖子，都收在这里。
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-wider tabular-nums text-muted-foreground/80">
              <span>
                共 <span className="font-semibold text-foreground">{total}</span> 条
              </span>
            </div>
          </div>
        </div>
      </section>

      {total > 0 ? (
        <>
          {/* 视图切换 */}
          <div className="flex items-center justify-end border-b border-border/60 pb-2">
            <FeedViewToggle currentView={view} basePath="/bookmarks" />
          </div>

          {view === 'compact' ? (
            <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
              {enriched.map((p) => (
                <PostCard key={p.id} post={p} mode="compact" />
              ))}
            </div>
          ) : (
            <div className={cn('space-y-3')}>
              {enriched.map((p) => (
                <PostCard key={p.id} post={p} mode="card" />
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={Bookmark}
          title="还没有收藏"
          description="在帖子卡片或详情页点收藏图标，下次找它们方便些"
          action={{ label: '去看看动态', href: '/feed' }}
        />
      )}
    </div>
  );
}
