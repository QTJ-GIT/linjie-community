'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown, Newspaper, Activity, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketItem {
  price: number;
  change: number;
  changePercent: number;
  source: string;
  timestamp: string;
}

interface GoldData {
  gold: MarketItem | null;
  silver: MarketItem | null;
  dollarIndex: MarketItem | null;
  crudeOil: MarketItem | null;
  isRealtime: boolean;
  cachedAt?: string;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  region: 'international' | 'domestic';
  category: string;
  isHot: boolean;
  relevanceScore: number;
}

function MarketCard({
  label,
  icon,
  data,
  colorClass,
}: {
  label: string;
  icon: React.ReactNode;
  data: MarketItem | null;
  colorClass: string;
}) {
  if (!data) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/50 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">加载中...</p>
      </div>
    );
  }

  const isUp = data.change >= 0;

  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4 transition-colors hover:bg-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span
          className={cn(
            'flex items-center gap-0.5 text-xs font-mono font-medium',
            isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          )}
        >
          {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isUp ? '+' : ''}
          {data.changePercent.toFixed(2)}%
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={cn('text-2xl font-bold tracking-tight', colorClass)}>
          {data.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span
          className={cn(
            'text-xs font-mono',
            isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          )}
        >
          {isUp ? '+' : ''}
          {data.change.toFixed(2)}
        </span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground/60">{data.source}</p>
    </div>
  );
}

function Sparkline({ data, isUp }: { data: number[]; isUp: boolean }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 120;
      const y = 36 - ((v - min) / range) * 32 - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 120 36" className="h-10 w-full" fill="none">
      <polyline
        points={points}
        stroke={isUp ? 'hsl(150 60% 45%)' : 'hsl(0 70% 50%)'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function generateMockHistory(basePrice: number): number[] {
  const history: number[] = [];
  let price = basePrice;
  for (let i = 0; i < 30; i++) {
    price += (Math.random() - 0.5) * (basePrice * 0.002);
    history.push(price);
  }
  return history;
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <a
      href="#"
      className="group flex flex-col gap-1 rounded-lg border border-border/40 bg-card/30 p-3 transition-colors hover:bg-card/60"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-snug group-hover:text-[hsl(var(--brand-600))] dark:group-hover:text-[hsl(var(--brand-400))]">
          {item.title}
        </h4>
        {item.isHot && (
          <span className="shrink-0 rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400">
            热门
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">{item.summary}</p>
      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground/60">
        <span>{item.source}</span>
        <span>·</span>
        <span className="uppercase">{item.region === 'international' ? '国际' : '国内'}</span>
      </div>
    </a>
  );
}

export function GoldMarketPanel() {
  const [data, setData] = React.useState<GoldData | null>(null);
  const [news, setNews] = React.useState<NewsItem[]>([]);
  const [newsRegion, setNewsRegion] = React.useState<'all' | 'international' | 'domestic'>('all');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      const [marketRes, newsRes] = await Promise.all([
        fetch('/api/gold', { cache: 'no-store' }),
        fetch('/api/gold?type=news', { cache: 'no-store' }),
      ]);

      if (!marketRes.ok || !newsRes.ok) {
        throw new Error('数据获取失败');
      }

      const marketJson = await marketRes.json();
      const newsJson = await newsRes.json();

      if (marketJson.code === 0) {
        setData(marketJson.data);
      }
      if (newsJson.code === 0) {
        setNews(newsJson.data);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredNews = React.useMemo(() => {
    if (newsRegion === 'all') return news;
    return news.filter((n) => n.region === newsRegion);
  }, [news, newsRegion]);

  const goldHistory = React.useMemo(() => {
    if (!data?.gold) return [];
    return generateMockHistory(data.gold.price);
  }, [data?.gold?.price]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/50 p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4 animate-spin" />
          加载黄金资讯...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          黄金数据加载失败：{error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <span className="text-lg">🥇</span>
          </div>
          <div>
            <h2 className="text-h3 font-bold tracking-tight">黄金资讯</h2>
            <p className="text-xs text-muted-foreground">
              {data?.isRealtime ? '实时数据' : '缓存数据'} · 每30秒刷新
            </p>
          </div>
        </div>
        {!data?.isRealtime && (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            离线模式
          </span>
        )}
      </div>

      {/* Market Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MarketCard
          label="黄金期货"
          icon={<span className="text-sm">🥇</span>}
          data={data?.gold ?? null}
          colorClass="text-amber-600 dark:text-amber-400"
        />
        <MarketCard
          label="白银期货"
          icon={<span className="text-sm">🥈</span>}
          data={data?.silver ?? null}
          colorClass="text-slate-600 dark:text-slate-400"
        />
        <MarketCard
          label="美元指数"
          icon={<span className="text-sm">💵</span>}
          data={data?.dollarIndex ?? null}
          colorClass="text-emerald-600 dark:text-emerald-400"
        />
        <MarketCard
          label="原油期货"
          icon={<span className="text-sm">🛢️</span>}
          data={data?.crudeOil ?? null}
          colorClass="text-orange-600 dark:text-orange-400"
        />
      </div>

      {/* Gold Chart */}
      {data?.gold && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium">黄金价格走势（30分钟模拟）</h3>
            <span className="text-[10px] text-muted-foreground/60">COMEX黄金</span>
          </div>
          <Sparkline data={goldHistory} isUp={data.gold.change >= 0} />
        </div>
      )}

      {/* News */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">财经新闻</h3>
          </div>
          <div className="flex gap-1">
            {(['all', 'international', 'domestic'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setNewsRegion(r)}
                className={cn(
                  'rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors',
                  newsRegion === r
                    ? 'bg-[hsl(var(--brand-500))]/10 text-[hsl(var(--brand-600))] dark:text-[hsl(var(--brand-400))]'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {r === 'all' ? '全部' : r === 'international' ? '国际' : '国内'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {filteredNews.slice(0, 5).map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
