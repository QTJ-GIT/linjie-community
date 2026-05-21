import { Inbox } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PostCard } from '@/components/posts/PostCard';
import { LoadMore } from '@/components/posts/LoadMore';
import { FeedScrollReveal } from '@/components/posts/FeedScrollReveal';
import { EmptyState } from '@/components/empty-state';
import { hotScore } from '@/lib/hot-score';
import type { PostSentiment, PostWithAuthor, SectionSlug } from '@/types/domain';

export type FeedSortKey = 'hot' | 'new' | 'top' | 'discussed';
export type FeedViewMode = 'card' | 'compact';

export interface FeedListProps {
  sort: FeedSortKey;
  sectionSlug?: SectionSlug;
  pageSize?: number;
  mode?: FeedViewMode;
}

type PostRowCommon = {
  id: string;
  author_id: string;
  section_slug: SectionSlug;
  type: 'post' | 'question';
  title: string;
  body_json: Record<string, unknown>;
  body_text: string;
  accepted_answer_id: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  score: number;
  sentiment: PostSentiment | null;
  last_activity_at: string | null;
  last_replier_id: string | null;
  author: unknown;
  last_replier: unknown;
  post_tickers: { symbol: string }[] | null;
};

const SELECT_COLS = `id, author_id, section_slug, type, title, body_json, body_text,
  accepted_answer_id, is_deleted, created_at, updated_at, score, sentiment,
  last_activity_at, last_replier_id,
  author:profiles!posts_author_id_fkey ( id, handle, display_name, avatar_url ),
  last_replier:profiles!posts_last_replier_id_fkey ( id, handle, display_name, avatar_url ),
  post_tickers ( symbol )`;

/**
 * FeedList — async server component that fetches and renders posts for feed /
 * section pages. Intended to be wrapped in <Suspense> so the surrounding shell
 * (tabs, header) can stream in first.
 */
export async function FeedList({ sort, sectionSlug, pageSize = 20, mode = 'card' }: FeedListProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let rows: PostRowCommon[] = [];
  let loadErr: string | null = null;

  const baseQuery = () => {
    let q = supabase.from('posts').select(SELECT_COLS).eq('is_deleted', false);
    if (sectionSlug) q = q.eq('section_slug', sectionSlug);
    return q;
  };

  if (sort === 'new') {
    const { data, error } = await baseQuery()
      .order('created_at', { ascending: false })
      .limit(pageSize);
    if (error) loadErr = error.message;
    rows = (data ?? []) as unknown as PostRowCommon[];
  } else if (sort === 'top') {
    const { data, error } = await baseQuery()
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(pageSize);
    if (error) loadErr = error.message;
    rows = (data ?? []) as unknown as PostRowCommon[];
  } else if (sort === 'discussed') {
    let q = supabase
      .from('posts')
      .select(`${SELECT_COLS}, comments(count)`)
      .eq('is_deleted', false);
    if (sectionSlug) q = q.eq('section_slug', sectionSlug);
    const { data, error } = await q
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) loadErr = error.message;
    const withCount = ((data ?? []) as Array<
      PostRowCommon & { comments: { count: number }[] | null }
    >).map((p) => ({
      post: p as PostRowCommon,
      c: (p.comments?.[0]?.count as number | undefined) ?? 0,
    }));
    withCount.sort((a, b) => b.c - a.c || b.post.created_at.localeCompare(a.post.created_at));
    rows = withCount.slice(0, pageSize).map((x) => x.post);
  } else {
    // hot
    const { data, error } = await baseQuery()
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) loadErr = error.message;
    const all = (data ?? []) as unknown as PostRowCommon[];
    const scored = all.map((p) => ({ post: p, h: hotScore(p.score ?? 0, p.created_at) }));
    scored.sort((a, b) => b.h - a.h);
    rows = scored.slice(0, pageSize).map((x) => x.post);
  }

  if (loadErr) {
    return <p className="text-sm text-destructive">加载失败：{loadErr}</p>;
  }

  const posts = rows;
  const ids = posts.map((p) => p.id);

  const [votedRows, commentCounts] = await Promise.all([
    ids.length && user
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
    const tickers = (p.post_tickers ?? []).map((t) => t.symbol);
    const authorArr = p.author;
    const author = Array.isArray(authorArr)
      ? (authorArr[0] as PostWithAuthor['author'])
      : (authorArr as PostWithAuthor['author']);
    const lastReplierArr = p.last_replier;
    const lastReplier = Array.isArray(lastReplierArr)
      ? ((lastReplierArr[0] as PostWithAuthor['last_replier']) ?? null)
      : ((lastReplierArr as PostWithAuthor['last_replier']) ?? null);
    return {
      id: p.id,
      author_id: p.author_id,
      section_slug: p.section_slug,
      type: p.type,
      title: p.title,
      body_json: p.body_json,
      body_text: p.body_text,
      accepted_answer_id: p.accepted_answer_id,
      is_deleted: p.is_deleted,
      created_at: p.created_at,
      updated_at: p.updated_at,
      score: p.score ?? 0,
      sentiment: p.sentiment ?? null,
      last_activity_at: p.last_activity_at ?? null,
      last_replier_id: p.last_replier_id ?? null,
      author,
      last_replier: lastReplier,
      tickers,
      comment_count: commentCount.get(p.id) ?? 0,
      my_vote: myVoteMap.get(p.id) ?? 0,
    };
  });

  const nextCursor =
    sort === 'new' && enriched.length === pageSize
      ? enriched[enriched.length - 1]!.created_at
      : null;

  if (enriched.length === 0) {
    if (sectionSlug) {
      return (
        <EmptyState
          icon={Inbox}
          title="该分区还没有内容"
          description="来发第一个帖子吧。"
          {...(user
            ? { action: { label: '发新帖', href: `/posts/new?section=${sectionSlug}` } }
            : {})}
        />
      );
    }
    return (
      <EmptyState
        icon={Inbox}
        title="还没有内容"
        description="关注一些版块或用户后，这里会出现他们的动态。"
        action={{ label: '去发现', href: '/trending' }}
      />
    );
  }

  if (mode === 'compact') {
    return (
      <>
        <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
          {enriched.map((p) => (
            <PostCard key={p.id} post={p} mode="compact" />
          ))}
        </div>
        {sort === 'new' ? (
          <LoadMore
            initialCursor={nextCursor}
            section={sectionSlug}
            sort={sort}
            mode="compact"
          />
        ) : null}
      </>
    );
  }

  // card mode：第一屏前 6 条用 ScrollReveal 错落入场（仅一次）
  const REVEAL_FIRST_N = 6;
  const firstChunk = enriched.slice(0, REVEAL_FIRST_N);
  const restChunk = enriched.slice(REVEAL_FIRST_N);
  return (
    <>
      <FeedScrollReveal>
        {firstChunk.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </FeedScrollReveal>
      {restChunk.length > 0 ? (
        <div className="space-y-3 pt-3">
          {restChunk.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      ) : null}
      {sort === 'new' ? (
        <LoadMore initialCursor={nextCursor} section={sectionSlug} sort={sort} />
      ) : null}
    </>
  );
}
