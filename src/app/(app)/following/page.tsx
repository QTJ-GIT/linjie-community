import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PostCard } from '@/components/posts/PostCard';
import { EmptyState } from '@/components/empty-state';
import type { PostSentiment, PostWithAuthor, SectionSlug } from '@/types/domain';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

type PostRow = {
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
  author: unknown;
  post_tickers: { symbol: string }[] | null;
};

const SELECT_COLS = `id, author_id, section_slug, type, title, body_json, body_text,
  accepted_answer_id, is_deleted, created_at, updated_at, score, sentiment,
  author:profiles!posts_author_id_fkey ( id, handle, display_name, avatar_url ),
  post_tickers ( symbol )`;

export default async function FollowingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirect=/following');
  }

  const { data: followingRows, error: followingErr } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id);

  if (followingErr) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-xl font-semibold">关注动态</h1>
        <p className="mt-4 text-sm text-destructive">加载失败：{followingErr.message}</p>
      </div>
    );
  }

  const followingIds = (followingRows ?? []).map((r) => r.following_id as string);

  if (followingIds.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
        <h1 className="text-xl font-semibold">关注动态</h1>
        <EmptyState
          icon={Users}
          title="还没有关注任何人"
          description="去发现有趣的用户，关注后就能在这里看到他们的动态。"
          action={{ label: '去发现', href: '/feed' }}
        />
      </div>
    );
  }

  const { data, error } = await supabase
    .from('posts')
    .select(SELECT_COLS)
    .eq('is_deleted', false)
    .in('author_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-xl font-semibold">关注动态</h1>
        <p className="mt-4 text-sm text-destructive">加载失败：{error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as unknown as PostRow[];
  const ids = rows.map((p) => p.id);

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

  const enriched: PostWithAuthor[] = rows.map((p) => {
    const tickers = (p.post_tickers ?? []).map((t) => t.symbol);
    const authorArr = p.author;
    const author = Array.isArray(authorArr)
      ? (authorArr[0] as PostWithAuthor['author'])
      : (authorArr as PostWithAuthor['author']);
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
      author,
      tickers,
      comment_count: commentCount.get(p.id) ?? 0,
      my_vote: myVoteMap.get(p.id) ?? 0,
    };
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">关注动态</h1>
        <Link href="/feed" className="text-sm text-muted-foreground hover:text-foreground">
          全部动态
        </Link>
      </div>

      {enriched.length === 0 ? (
        <EmptyState
          icon={Users}
          title="暂无关注动态"
          description="你关注的人还没有发帖。"
        />
      ) : (
        <div className="space-y-3">
          {enriched.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
