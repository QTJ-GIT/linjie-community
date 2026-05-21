import { Suspense } from 'react';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { FeedList, type FeedSortKey, type FeedViewMode } from '@/components/posts/FeedList';
import { PostListSkeleton } from '@/components/posts/PostListSkeleton';
import { FeedVisitMarker } from '@/components/posts/FeedVisitMarker';
import { FeedViewToggle } from '@/components/posts/FeedViewToggle';
import { GradientMesh } from '@/components/effects/GradientMesh';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const SORTS: { key: FeedSortKey; label: string }[] = [
  { key: 'hot', label: '热门' },
  { key: 'new', label: '最新' },
  { key: 'top', label: '高分' },
  { key: 'discussed', label: '讨论多' },
];

const SECTION_LABELS: Record<string, string> = {
  general: '综合',
  qa: '问答',
  stocks: '股票',
};

const getFeedStats = unstable_cache(
  async () => {
    // 用 service-role admin client：unstable_cache scope 内不能调 cookies()。
    // 这里读公开聚合（24h post count / unique authors / section count），
    // 不依赖 viewer，绕过 RLS 安全无虞。
    const supabase = createAdminClient();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [postsToday, activeUsers, topSection] = await Promise.all([
      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)
        .gte('created_at', since),
      supabase
        .from('posts')
        .select('author_id')
        .eq('is_deleted', false)
        .gte('created_at', since),
      supabase
        .from('posts')
        .select('section_slug')
        .eq('is_deleted', false)
        .gte('created_at', since),
    ]);
    const uniqueAuthors = new Set((activeUsers.data ?? []).map((r) => r.author_id)).size;
    const sectionCounts = new Map<string, number>();
    for (const r of (topSection.data ?? []) as { section_slug: string }[]) {
      sectionCounts.set(r.section_slug, (sectionCounts.get(r.section_slug) ?? 0) + 1);
    }
    const sorted = [...sectionCounts.entries()].sort((a, b) => b[1] - a[1]);
    return {
      postsToday: postsToday.count ?? 0,
      activeUsers: uniqueAuthors,
      topSection: sorted[0]?.[0] ?? null,
    };
  },
  ['feed-stats'],
  { revalidate: 300 }
);

function parseSort(v: string | undefined): FeedSortKey {
  if (v === 'new' || v === 'top' || v === 'discussed' || v === 'hot') return v;
  return 'hot';
}

function parseView(v: string | undefined): FeedViewMode {
  return v === 'compact' ? 'compact' : 'card';
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: { sort?: string; view?: string };
}) {
  const sort = parseSort(searchParams?.sort);
  const view = parseView(searchParams?.view);
  const supabase = createClient();
  const [
    {
      data: { user },
    },
    stats,
  ] = await Promise.all([supabase.auth.getUser(), getFeedStats()]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-6">
      <FeedVisitMarker scope="feed" />

      {/* Hero stripe — 低高度装饰，约 130px */}
      <section className="relative isolate overflow-hidden rounded-2xl border border-border/60 px-5 py-6 sm:px-6">
        <GradientMesh blur={50} className="opacity-70" />
        <div className="absolute inset-0 -z-10 bg-background/55 backdrop-blur-sm" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[hsl(var(--brand-500))]">
              今日讨论
            </p>
            <h1 className="mt-1 text-h2 font-semibold tracking-tight">
              最新动态
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              社区里最近发生的事，按你选的顺序排好。
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground/80">
              <span>
                <span className="font-semibold text-foreground">{stats.postsToday}</span> 帖/24h
              </span>
              <span aria-hidden className="text-muted-foreground/40">
                ·
              </span>
              <span>
                <span className="font-semibold text-foreground">{stats.activeUsers}</span> 人活跃
              </span>
              {stats.topSection ? (
                <>
                  <span aria-hidden className="text-muted-foreground/40">
                    ·
                  </span>
                  <span>
                    最热{' '}
                    <span className="font-semibold text-foreground">
                      {SECTION_LABELS[stats.topSection] ?? stats.topSection}
                    </span>
                  </span>
                </>
              ) : null}
            </div>
          </div>
          {user ? (
            <Button asChild size="sm" className="gap-1.5">
              <Link href="/posts/new">
                <Plus className="h-4 w-4" />
                发新帖
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      {/* Sort + view 控制条 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
        <nav
          aria-label="排序"
          className="flex items-center gap-1 text-sm"
        >
          {SORTS.map((s) => {
            const active = s.key === sort;
            const href = view === 'compact' ? `/feed?sort=${s.key}&view=compact` : `/feed?sort=${s.key}`;
            return (
              <Link
                key={s.key}
                href={href}
                data-state={active ? 'active' : 'inactive'}
                className={cn(
                  'relative inline-flex items-center px-2.5 py-1.5 font-medium transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {s.label}
                {/* 细线 underline */}
                <span
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute inset-x-1.5 -bottom-[9px] h-[2px] rounded-full transition-all',
                    active ? 'bg-foreground' : 'bg-transparent'
                  )}
                />
              </Link>
            );
          })}
        </nav>
        <FeedViewToggle currentSort={sort} currentView={view} />
      </div>

      <Suspense key={`${sort}:${view}`} fallback={<PostListSkeleton />}>
        <FeedList sort={sort} mode={view} />
      </Suspense>
    </div>
  );
}
