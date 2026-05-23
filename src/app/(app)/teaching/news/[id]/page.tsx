import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft, Newspaper, ExternalLink, Calendar, Shield } from 'lucide-react';
import { SITE } from '@/lib/site';
import type { NewsDetail } from '@/lib/news/types';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
  searchParams?: { url?: string };
}

async function fetchNewsDetail(url: string): Promise<NewsDetail> {
  try {
    const res = await fetch(
      `http://localhost:3000/api/news/detail?url=${encodeURIComponent(url)}`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) throw new Error('fetch failed');
    const json = await res.json();
    return json.data || { title: '获取失败', content: '<p>暂无内容</p>', source: '新浪财经', publish_time: '', url };
  } catch {
    return {
      title: '获取详情失败',
      content: '<p>抱歉，暂时无法获取该资讯的详细内容。</p>',
      source: '新浪财经',
      publish_time: new Date().toLocaleString('zh-CN'),
      url,
    };
  }
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const url = searchParams?.url;
  if (!url) return { title: `新闻详情 · ${SITE.name}` };

  const detail = await fetchNewsDetail(url);
  return {
    title: `${detail.title} · 股市新闻 · ${SITE.name}`,
    description: detail.content.replace(/<[^>]+>/g, '').slice(0, 160),
  };
}

export default async function NewsDetailPage({ searchParams }: PageProps) {
  const url = searchParams?.url;
  if (!url) notFound();

  const news = await fetchNewsDetail(url);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      {/* 面包屑 */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/teaching" className="hover:text-foreground transition-colors">
          教学大厅
        </Link>
        <span>/</span>
        <Link href="/teaching/news" className="hover:text-foreground transition-colors">
          股市新闻
        </Link>
        <span>/</span>
        <span className="truncate text-foreground/70 max-w-[200px]">详情</span>
      </nav>

      {/* 返回 */}
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-1 -ml-2 text-muted-foreground">
          <Link href="/teaching/news">
            <ChevronLeft className="h-4 w-4" />
            返回列表
          </Link>
        </Button>
      </div>

      {/* 文章 */}
      <article className="rounded-xl border border-border/60 bg-card p-5 sm:p-6 space-y-5">
        {/* 头部 */}
        <header className="space-y-3 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Newspaper className="h-3.5 w-3.5" />
              {news.source}
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {news.publish_time}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold leading-snug tracking-tight">
            {news.title}
          </h1>
        </header>

        {/* 正文 */}
        <div
          className="prose-post text-sm leading-relaxed text-foreground/90"
          dangerouslySetInnerHTML={{ __html: news.content }}
        />

        {/* 底部 */}
        <footer className="pt-4 border-t border-border/40 space-y-4">
          <div className="flex items-center justify-between">
            <Button asChild variant="outline" size="sm">
              <a
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                查看原文
              </a>
            </Button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-700">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span>
              本资讯仅供参考，不构成任何投资建议。股市有风险，投资需谨慎。
            </span>
          </div>
        </footer>
      </article>
    </div>
  );
}
