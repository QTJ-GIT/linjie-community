import type { Metadata } from 'next';
import { Search, SearchX } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { PostCard } from '@/components/posts/PostCard';
import { EmptyState } from '@/components/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SITE } from '@/lib/site';
import type { PostSentiment, PostWithAuthor, SectionSlug } from '@/types/domain';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `搜索 · ${SITE.name}`,
  description: '在临介社区搜索帖子、问答和股票讨论',
  alternates: { canonical: `${SITE.url}/search` },
  robots: { index: false, follow: true },
};

const LIMIT = 50;

type Scope = 'posts' | 'users' | 'tickers';

const SCOPES: { key: Scope; label: string; disabled: boolean }[] = [
  { key: 'posts', label: '帖子', disabled: false },
  { key: 'users', label: '用户', disabled: true },
  { key: 'tickers', label: 'Ticker', disabled: true },
];

function SearchHero({ q, scope = 'posts' }: { q: string; scope?: Scope }) {
  return (
    <section className="rounded-2xl border border-border/60 px-5 py-5 sm:px-6">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[hsl(var(--brand-500))]">
            站内搜索
          </p>
          <h1 className="mt-1 font-display text-h2 font-semibold tracking-tight">搜索</h1>
        </div>

        <form action="/search" method="get" role="search" className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              name="q"
              defaultValue={q}
              autoComplete="off"
              placeholder="输入关键词、@handle 或 $TICKER"
              className="h-10 pl-9"
              aria-label="搜索关键词"
            />
          </div>
          <Button type="submit" size="default" className="h-10">
            搜索
          </Button>
        </form>

        {/* Scope tabs */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="搜索范围">
          <span className="mr-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground/80">
            范围
          </span>
          {SCOPES.map((s) => {
            const active = s.key === scope;
            return (
              <span
                key={s.key}
                role="tab"
                aria-selected={active}
                aria-disabled={s.disabled || undefined}
                title={s.disabled ? '即将支持' : undefined}
                className={cn(
                  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-foreground/30 bg-foreground/[0.06] text-foreground'
                    : 'border-border/60 text-muted-foreground',
                  s.disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {s.label}
                {s.disabled ? (
                  <span className="ml-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    待开放
                  </span>
                ) : null}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const q = (searchParams?.q ?? '').trim();

  // 状态 1: 未输入
  if (!q) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-6">
        <SearchHero q="" />
        <EmptyState
          icon={Search}
          title="开始搜索"
          description="输入关键词、@handle 或 $TICKER，按回车看结果。"
        />
      </div>
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pattern = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;

  const { data: rows, error } = await supabase
    .from('posts')
    .select(
      `id, author_id, section_slug, type, title, body_json, body_text,
       accepted_answer_id, is_deleted, created_at, updated_at, score, sentiment,
       author:profiles!posts_author_id_fkey ( id, handle, display_name, avatar_url ),
       post_tickers ( symbol )`
    )
    .eq('is_deleted', false)
    .or(`title.ilike.${pattern},body_text.ilike.${pattern}`)
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-6">
        <SearchHero q={q} />
        <p className="text-sm text-destructive">搜索失败：{error.message}</p>
      </div>
    );
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

  const total = enriched.length;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-6">
      <SearchHero q={q} />

      {total === 0 ? (
        // 状态 2: 有 query 无结果
        <EmptyState
          icon={SearchX}
          title={`没有匹配 "${q}"`}
          description="试试不同关键词，或换一个搜索范围。"
        />
      ) : (
        <>
          <div className="border-b border-border/60 pb-2">
            <p className="font-mono text-[11px] uppercase tracking-wider tabular-nums text-muted-foreground">
              找到 <span className="font-semibold text-foreground">{total}</span> 条结果
            </p>
          </div>
          <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
            {enriched.map((p) => (
              <PostCard key={p.id} post={p} mode="compact" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
