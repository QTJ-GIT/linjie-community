'use server';

import { createClient } from '@/lib/supabase/server';
import type { PostSentiment, PostWithAuthor, SectionSlug } from '@/types/domain';

const PAGE_SIZE = 20;

export type SortKey = 'hot' | 'new' | 'top' | 'discussed';

export type LoadMoreInput = {
  cursor: string;
  section?: SectionSlug;
  sort?: SortKey;
};

export type LoadMoreResult = {
  posts: PostWithAuthor[];
  nextCursor: string | null;
  error?: string;
};

export async function loadMorePosts({
  cursor,
  section,
  sort = 'new',
}: LoadMoreInput): Promise<LoadMoreResult> {
  // Only 'new' supports cursor paging. Other sorts: return nothing more.
  if (sort !== 'new') {
    return { posts: [], nextCursor: null };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from('posts')
    .select(
      `id, author_id, section_slug, type, title, body_json, body_text,
       accepted_answer_id, is_deleted, created_at, updated_at, score, sentiment,
       author:profiles!posts_author_id_fkey ( id, handle, display_name, avatar_url ),
       post_tickers ( symbol )`
    )
    .eq('is_deleted', false)
    .lt('created_at', cursor)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);

  if (section) query = query.eq('section_slug', section);

  const { data: rows, error } = await query;
  if (error) {
    return { posts: [], nextCursor: null, error: error.message };
  }

  const posts = (rows ?? []) as Array<{
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
  }>;
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

  const nextCursor =
    enriched.length === PAGE_SIZE ? enriched[enriched.length - 1]!.created_at : null;

  return { posts: enriched, nextCursor };
}
