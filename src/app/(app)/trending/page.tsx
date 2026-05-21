import type { Metadata } from 'next';
import { Flame } from 'lucide-react';
import { TickerBarChart } from '@/components/posts/TickerBarChart';
import { TrendingPostRow } from '@/components/posts/TrendingPostRow';
import { createClient } from '@/lib/supabase/server';
import { hotScore } from '@/lib/hot-score';
import { SITE } from '@/lib/site';
import type { PostSentiment, PostWithAuthor, SectionSlug } from '@/types/domain';

export const metadata: Metadata = {
  title: `热度榜 · ${SITE.name}`,
  description: '按热度算法排序的最新热门帖与 24 小时活跃股票',
  alternates: { canonical: `${SITE.url}/trending` },
  openGraph: {
    title: `热度榜 · ${SITE.name}`,
    description: '按热度算法排序的最新热门帖与 24 小时活跃股票',
    url: `${SITE.url}/trending`,
    type: 'website',
    siteName: SITE.name,
    locale: SITE.locale,
  },
  twitter: { card: 'summary_large_image', title: `热度榜 · ${SITE.name}` },
};

export const dynamic = 'force-dynamic';

const WINDOW_MS = 24 * 60 * 60 * 1000;
const FETCH_LIMIT = 200;
const TOP_POSTS = 10;
const TICKER_TOP_N = 8;

type ScoredPost = { post: PostWithAuthor; hot: number };

export default async function TrendingPage() {
  const supabase = createClient();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Pull recent posts (200 in 24h window) → score with hotScore → top 10.
  const hotPostsRaw = await supabase
    .from('posts')
    .select(
      `id, author_id, section_slug, type, title, body_json, body_text,
       accepted_answer_id, is_deleted, created_at, updated_at, score, sentiment,
       author:profiles!posts_author_id_fkey ( id, handle, display_name, avatar_url ),
       post_tickers ( symbol )`
    )
    .eq('is_deleted', false)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(FETCH_LIMIT);

  const hotPostRows = hotPostsRaw.data ?? [];
  const hotPostIds = hotPostRows.map((p) => p.id);

  const [votedRows, commentRows] = await Promise.all([
    hotPostIds.length && user
      ? supabase
          .from('likes')
          .select('post_id, value')
          .eq('user_id', user.id)
          .in('post_id', hotPostIds)
          .is('comment_id', null)
      : Promise.resolve({ data: [] as { post_id: string | null; value: number }[] }),
    hotPostIds.length
      ? supabase
          .from('comments')
          .select('post_id')
          .in('post_id', hotPostIds)
          .eq('is_deleted', false)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
  ]);

  const commentCount = new Map<string, number>();
  for (const r of (commentRows.data ?? []) as { post_id: string }[]) {
    commentCount.set(r.post_id, (commentCount.get(r.post_id) ?? 0) + 1);
  }
  const myVoteMap = new Map<string, 1 | -1 | 0>();
  for (const r of (votedRows.data ?? []) as { post_id: string | null; value: number }[]) {
    if (r.post_id) myVoteMap.set(r.post_id, (r.value as 1 | -1 | 0) ?? 0);
  }

  const enrichedPosts: PostWithAuthor[] = hotPostRows.map((p) => {
    const tickers =
      (p.post_tickers as { symbol: string }[] | null)?.map((t) => t.symbol) ?? [];
    const authorArr = p.author as unknown;
    const author = Array.isArray(authorArr)
      ? (authorArr[0] as PostWithAuthor['author'])
      : (authorArr as PostWithAuthor['author']);
    return {
      id: p.id,
      author_id: p.author_id,
      section_slug: p.section_slug as SectionSlug,
      type: p.type,
      title: p.title,
      body_json: p.body_json as Record<string, unknown>,
      body_text: p.body_text,
      accepted_answer_id: p.accepted_answer_id,
      is_deleted: p.is_deleted,
      created_at: p.created_at,
      updated_at: p.updated_at,
      score: (p.score as number | undefined) ?? 0,
      sentiment: (p.sentiment as PostSentiment | null | undefined) ?? null,
      author,
      tickers,
      comment_count: commentCount.get(p.id) ?? 0,
      my_vote: myVoteMap.get(p.id) ?? 0,
    };
  });

  // hotScore-driven ranking. Comment count folded in as a small bonus so a
  // hot discussion outranks a single-upvote thread. Floor at 0 for the bar.
  const scoredPosts: ScoredPost[] = enrichedPosts
    .map((p) => ({
      post: p,
      hot: hotScore(p.score ?? 0, p.created_at) + (p.comment_count ?? 0) * 0.05,
    }))
    .sort(
      (a, b) => b.hot - a.hot || b.post.created_at.localeCompare(a.post.created_at)
    )
    .slice(0, TOP_POSTS);

  const minHot = scoredPosts.length
    ? Math.min(...scoredPosts.map((s) => s.hot))
    : 0;
  // Normalise to a 0-baseline so the bar visualises *relative* heat among the
  // top 10, not absolute score (which is dominated by the time term).
  const normalisedPosts = scoredPosts.map((s) => ({
    ...s,
    norm: s.hot - minHot + 0.0001,
  }));
  const maxHot = normalisedPosts.length
    ? Math.max(...normalisedPosts.map((s) => s.norm))
    : 1;

  // 24h active tickers: count post_tickers rows joined to posts created in window.
  const hotTickerRowsRes = await supabase
    .from('post_tickers')
    .select('symbol, posts!inner(created_at)')
    .gte('posts.created_at', since);

  const symbolCounts = new Map<string, number>();
  for (const r of (hotTickerRowsRes.data ?? []) as { symbol: string }[]) {
    symbolCounts.set(r.symbol, (symbolCounts.get(r.symbol) ?? 0) + 1);
  }

  const tickerItems = Array.from(symbolCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TICKER_TOP_N)
    .map(([symbol, count]) => ({ symbol, count }));

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 sm:p-6">
      {/* Hero */}
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-[hsl(var(--brand-500))]" />
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Trending · 24h
          </span>
        </div>
        <h2 className="font-display text-h2">热度榜</h2>
        <p className="text-sm text-muted-foreground">
          按热度算法排序，过去 24 小时内最受关注的帖子与股票。
        </p>
      </header>

      {/* 24h ticker activity */}
      {tickerItems.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold tracking-tight">24 小时活跃股票</h3>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Top {tickerItems.length}
            </span>
          </div>
          <TickerBarChart items={tickerItems} />
        </section>
      )}

      {/* Top 10 hot posts */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold tracking-tight">热度榜前 10</h3>
          {normalisedPosts.length > 0 && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              hotScore
            </span>
          )}
        </div>
        {normalisedPosts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">
            最近 24 小时还没有热门帖子。
          </p>
        ) : (
          <div className="space-y-2">
            {normalisedPosts.map((s, i) => (
              <TrendingPostRow
                key={s.post.id}
                rank={i + 1}
                hotScore={s.norm}
                maxHot={maxHot}
                post={s.post}
              />
            ))}
          </div>
        )}
      </section>

      {/* Empty state — when both ticker and posts are empty, show a friendly note */}
      {tickerItems.length === 0 && normalisedPosts.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">
          再等等 —— 24 小时窗口内还没有数据。
        </p>
      )}

    </div>
  );
}
