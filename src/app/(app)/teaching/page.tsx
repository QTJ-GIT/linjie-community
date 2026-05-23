import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AlertCircle, Newspaper, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { TeachingCard } from '@/components/teaching/TeachingCard';
import { cn } from '@/lib/utils';
import { SITE } from '@/lib/site';
import type { TeachingResourceWithAuthor } from '@/types/domain';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `教学大厅 · ${SITE.name}`,
  description: '视频教程与文章，供所有人免费浏览学习',
};

type FilterType = 'all' | 'video' | 'article';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'video', label: '视频' },
  { key: 'article', label: '文章' },
];

const CATEGORIES = [
  '股票入门',
  '技术分析',
  '基本面分析',
  '投资策略',
  '交易心理',
  '工具教程',
] as const;

function parseFilter(v: string | undefined): FilterType {
  if (v === 'video' || v === 'article') return v;
  return 'all';
}

async function ResourceList({ filter, category }: { filter: FilterType; category: string | null }) {
  const supabase = createClient();
  let query = supabase
    .from('teaching_resources')
    .select(
      `id, type, title, description, cover_image_url, thumbnail_url,
       video_url, embed_url, view_count, created_at, category,
       author:profiles!teaching_resources_author_id_fkey ( id, handle, display_name, avatar_url )`
    )
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(48);

  if (filter !== 'all') {
    query = query.eq('type', filter);
  }
  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error || !data) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <AlertCircle className="h-12 w-12 opacity-25" />
        <p className="text-sm font-medium">暂无内容</p>
      </div>
    );
  }

  const resources = data as unknown as TeachingResourceWithAuthor[];

  if (resources.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <AlertCircle className="h-12 w-12 opacity-25" />
        <p className="text-sm font-medium">暂无内容</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((r) => (
        <TeachingCard key={r.id} resource={r} />
      ))}
    </div>
  );
}

export default async function TeachingPage({
  searchParams,
}: {
  searchParams?: { type?: string; category?: string };
}) {
  const filter = parseFilter(searchParams?.type);
  const category = searchParams?.category || null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* 头部 */}
      <div>
        <h1 className="text-2xl font-semibold">教学大厅</h1>
        <p className="mt-1 text-sm text-muted-foreground">视频教程与文章，供所有人免费浏览</p>
      </div>

      {/* 股市新闻入口 */}
      <Link
        href="/news"
        className="group flex items-center justify-between rounded-xl border border-border/60 bg-gradient-to-r from-card to-muted/30 p-4 transition-all hover:border-primary/40 hover:shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              股市新闻
            </p>
            <p className="text-xs text-muted-foreground">实时财经资讯与市场动态</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      </Link>

      {/* 类型筛选 */}
      <nav className="flex items-center gap-1 border-b">
        {FILTERS.map((f) => {
          const active = f.key === filter;
          const href = f.key === 'all'
            ? (category ? `/teaching?category=${encodeURIComponent(category)}` : '/teaching')
            : `/teaching?type=${f.key}${category ? `&category=${encodeURIComponent(category)}` : ''}`;
          return (
            <Link
              key={f.key}
              href={href}
              className={cn(
                'relative px-3 py-2 text-sm transition-colors',
                active
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
              {active ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={filter === 'all' ? '/teaching' : `/teaching?type=${filter}`}
          className={cn(
            'rounded-full px-3 py-1 text-xs transition-colors border',
            !category
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
          )}
        >
          全部分类
        </Link>
        {CATEGORIES.map((c) => {
          const active = category === c;
          const href = filter === 'all'
            ? `/teaching?category=${encodeURIComponent(c)}`
            : `/teaching?type=${filter}&category=${encodeURIComponent(c)}`;
          return (
            <Link
              key={c}
              href={href}
              className={cn(
                'rounded-full px-3 py-1 text-xs transition-colors border',
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
              )}
            >
              {c}
            </Link>
          );
        })}
      </div>

      {/* 列表 */}
      <Suspense
        key={`${filter}-${category ?? 'all'}`}
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-border/40 bg-muted/20">
                <div className="aspect-video w-full bg-muted/40 rounded-t-xl" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        }
      >
        <ResourceList filter={filter} category={category} />
      </Suspense>
    </div>
  );
}
