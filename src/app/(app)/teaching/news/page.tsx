import Link from 'next/link';
import { Metadata } from 'next';
import { Newspaper, ChevronLeft, RefreshCw, ExternalLink, Clock, Shield } from 'lucide-react';
import { SITE } from '@/lib/site';
import type { NewsItem } from '@/lib/news/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `股市新闻 · ${SITE.name}`,
  description: '实时获取新浪财经最新股市资讯，把握市场动态',
};

const CATEGORY_COLORS: Record<string, string> = {
  '财经要闻': 'bg-red-500/10 text-red-600 border-red-500/20',
  '市场动态': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  '个股行情': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  '政策解读': 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  '行业观察': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  '资金动向': 'bg-pink-500/10 text-pink-600 border-pink-500/20',
};

function getCategoryClass(category: string): string {
  return CATEGORY_COLORS[category] || 'bg-muted text-muted-foreground border-border';
}

function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  } catch {
    return dateString;
  }
}

async function fetchNewsList(): Promise<NewsItem[]> {
  try {
    const res = await fetch('http://localhost:3000/api/news', { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams?: { category?: string; q?: string };
}) {
  const news = await fetchNewsList();
  const activeCategory = searchParams?.category || 'all';
  const searchQuery = searchParams?.q || '';

  const filtered = news.filter((item) => {
    const matchCat = activeCategory === 'all' || item.category === activeCategory;
    const matchSearch =
      !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const categories = ['all', ...Array.from(new Set(news.map((n) => n.category)))];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      {/* 头部 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link
              href="/teaching"
              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              教学大厅
            </Link>
            <span>/</span>
            <span className="text-foreground">股市新闻</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Newspaper className="h-6 w-6 text-[hsl(var(--brand-500))]" />
            股市新闻
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            实时获取新浪财经最新资讯，把握市场动态
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/teaching/news">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            刷新
          </Link>
        </Button>
      </div>

      {/* 免责声明 */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-700">
        <Shield className="h-4 w-4 shrink-0" />
        <span>股市有风险，投资需谨慎。本平台仅提供信息展示服务，不构成任何投资建议。</span>
      </div>

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <Link
            key={cat}
            href={cat === 'all' ? '/teaching/news' : `/teaching/news?category=${encodeURIComponent(cat)}`}
            className={
              'rounded-full px-3 py-1 text-xs font-medium transition-colors border ' +
              (activeCategory === cat || (cat === 'all' && activeCategory === 'all')
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-accent hover:text-foreground')
            }
          >
            {cat === 'all' ? '全部' : cat}
          </Link>
        ))}
      </div>

      {/* 搜索 */}
      <form className="flex gap-2" action="/teaching/news" method="GET">
        <input
          type="text"
          name="q"
          defaultValue={searchQuery}
          placeholder="搜索资讯标题..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
        {activeCategory !== 'all' && (
          <input type="hidden" name="category" value={activeCategory} />
        )}
        <Button type="submit" size="sm">
          搜索
        </Button>
      </form>

      {/* 新闻列表 */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card py-16 text-center">
          <Newspaper className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <h3 className="text-sm font-medium text-muted-foreground">暂无相关资讯</h3>
          <p className="mt-1 text-xs text-muted-foreground/70">尝试调整筛选条件或刷新页面</p>
        </div>
      )}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className="group rounded-xl border border-border/60 bg-card p-4 transition-all hover:shadow-md hover:border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={`text-[11px] font-medium ${getCategoryClass(item.category)}`}
            >
              {item.category}
            </Badge>
            <span className="text-[11px] text-muted-foreground">{item.source}</span>
          </div>

          <h3 className="text-sm font-semibold leading-snug group-hover:text-[hsl(var(--brand-600))] transition-colors line-clamp-2">
            <Link href={`/teaching/news/${item.id}?url=${encodeURIComponent(item.url)}`}>
              {item.title}
            </Link>
          </h3>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(item.publish_time)}
            </span>
          </div>
        </div>

        <Link
          href={`/teaching/news/${item.id}?url=${encodeURIComponent(item.url)}`}
          className="shrink-0 rounded-lg border border-border/60 bg-background p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="查看详情"
        >
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
