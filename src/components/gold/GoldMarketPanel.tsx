'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown, Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketItem {
  price: number;
  change: number;
  changePercent: number;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  region: 'international' | 'domestic';
  isHot: boolean;
}

const INITIAL_DATA: Record<string, MarketItem> = {
  gold: { price: 4603.07, change: 1.51, changePercent: 0.03 },
  silver: { price: 29.85, change: 0.12, changePercent: 0.4 },
  dollarIndex: { price: 104.25, change: -0.15, changePercent: -0.14 },
  crudeOil: { price: 78.45, change: 0.32, changePercent: 0.41 },
};

const NEWS: NewsItem[] = [
  {
    id: 'intl_1',
    title: '美联储利率决议公布在即 市场严阵以待',
    summary: '美联储即将公布最新利率决议，市场屏息等待指引。',
    source: 'Bloomberg',
    region: 'international',
    isHot: true,
  },
  {
    id: 'intl_2',
    title: '全球央行黄金储备持续攀升',
    summary: '最新数据显示全球央行继续增持黄金，新兴市场表现突出。',
    source: 'World Gold Council',
    region: 'international',
    isHot: true,
  },
  {
    id: 'intl_3',
    title: '美国经济数据影响黄金走势',
    summary: '最新美国经济数据公布，对黄金市场产生重要影响。',
    source: 'Reuters',
    region: 'international',
    isHot: false,
  },
  {
    id: 'intl_4',
    title: '地缘政治局势紧张 黄金避险需求升温',
    summary: '国际地缘政治紧张局势推动黄金避险需求。',
    source: 'CNBC',
    region: 'international',
    isHot: true,
  },
  {
    id: 'intl_5',
    title: '投行看好黄金前景',
    summary: '多家国际投行发布报告看好黄金未来走势。',
    source: 'Financial Times',
    region: 'international',
    isHot: false,
  },
  {
    id: 'dom_1',
    title: '中国央行公布最新储备数据',
    summary: '中国人民银行发布最新黄金储备数据。',
    source: '中国人民银行',
    region: 'domestic',
    isHot: true,
  },
  {
    id: 'dom_2',
    title: '国内黄金投资热度不减',
    summary: '上海黄金交易所数据显示投资热情持续高涨。',
    source: '上海黄金交易所',
    region: 'domestic',
    isHot: false,
  },
  {
    id: 'dom_3',
    title: '人民币汇率波动 黄金受关注',
    summary: '人民币汇率波动背景下黄金投资价值凸显。',
    source: '证券时报',
    region: 'domestic',
    isHot: false,
  },
];

function MarketCard({
  label,
  icon,
  data,
  colorClass,
}: {
  label: string;
  icon: React.ReactNode;
  data: MarketItem;
  colorClass: string;
}) {
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

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <div className="group flex flex-col gap-1 rounded-lg border border-border/40 bg-card/30 p-3 transition-colors hover:bg-card/60">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium leading-snug text-foreground/90">
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
    </div>
  );
}

export function GoldMarketPanel() {
  const [data, setData] = React.useState(INITIAL_DATA);
  const [history, setHistory] = React.useState<number[]>([]);
  const [newsRegion, setNewsRegion] = React.useState<'all' | 'international' | 'domestic'>('all');
  const [lastUpdate, setLastUpdate] = React.useState(new Date());

  // 生成初始历史数据
  React.useEffect(() => {
    const h: number[] = [];
    let p = data.gold.price;
    for (let i = 0; i < 30; i++) {
      p += (Math.random() - 0.5) * (p * 0.001);
      h.push(p);
    }
    setHistory(h);
  }, []);

  // 模拟价格波动
  React.useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const newData = { ...prev };
        (Object.keys(newData) as Array<keyof typeof newData>).forEach((key) => {
          const item = newData[key];
          const volatility = key === 'gold' ? 0.0005 : key === 'silver' ? 0.001 : 0.0003;
          const delta = item.price * volatility * (Math.random() - 0.5);
          const newPrice = item.price + delta;
          const newChange = item.change + delta;
          const basePrice = newPrice - newChange;
          newData[key] = {
            price: Math.round(newPrice * 100) / 100,
            change: Math.round(newChange * 100) / 100,
            changePercent: basePrice > 0 ? Math.round((newChange / basePrice) * 10000) / 100 : 0,
          };
        });
        return newData;
      });
      setHistory((prev) => {
        const next = [...prev.slice(1), prev[prev.length - 1] || data.gold.price];
        return next;
      });
      setLastUpdate(new Date());
    }, 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredNews = React.useMemo(() => {
    if (newsRegion === 'all') return NEWS;
    return NEWS.filter((n) => n.region === newsRegion);
  }, [newsRegion]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-lg">
            🥇
          </div>
          <div>
            <h2 className="text-h3 font-bold tracking-tight">黄金资讯</h2>
            <p className="text-xs text-muted-foreground">
              数据每30秒更新 · 最后更新 {lastUpdate.toLocaleTimeString('zh-CN')}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
          模拟数据
        </span>
      </div>

      {/* Market Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MarketCard label="黄金期货" icon={<span>🥇</span>} data={data.gold} colorClass="text-amber-600 dark:text-amber-400" />
        <MarketCard label="白银期货" icon={<span>🥈</span>} data={data.silver} colorClass="text-slate-600 dark:text-slate-400" />
        <MarketCard label="美元指数" icon={<span>💵</span>} data={data.dollarIndex} colorClass="text-emerald-600 dark:text-emerald-400" />
        <MarketCard label="原油期货" icon={<span>🛢️</span>} data={data.crudeOil} colorClass="text-orange-600 dark:text-orange-400" />
      </div>

      {/* Gold Chart */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium">黄金价格走势（30分钟模拟）</h3>
          <span className="text-[10px] text-muted-foreground/60">COMEX黄金</span>
        </div>
        <Sparkline data={history} isUp={data.gold.change >= 0} />
      </div>

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
