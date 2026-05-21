import Link from 'next/link';

export interface TickerBarChartItem {
  symbol: string;
  count: number;
}

export interface TickerBarChartProps {
  items: TickerBarChartItem[];
  className?: string;
}

/**
 * 24h ticker activity ticker —— 纯 Tailwind 横向条形图。
 * 最大值占满 100%，其他按比例。空数据由父组件兜底隐藏。
 */
export function TickerBarChart({ items, className }: TickerBarChartProps) {
  if (items.length === 0) return null;
  const maxCount = Math.max(...items.map((t) => t.count), 1);

  return (
    <div className={className ?? 'space-y-1'}>
      {items.map((t) => {
        const widthPct = Math.max((t.count / maxCount) * 100, 4);
        return (
          <Link
            key={t.symbol}
            href={`/tickers/${encodeURIComponent(t.symbol)}`}
            className="group flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/40"
          >
            <span className="w-16 shrink-0 font-mono text-xs font-semibold tabular-nums text-foreground">
              ${t.symbol}
            </span>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[hsl(var(--brand-500))] transition-[width] duration-300 ease-out group-hover:bg-[hsl(var(--brand-500))]/90"
                style={{ width: `${widthPct}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
              {t.count} 帖
            </span>
          </Link>
        );
      })}
    </div>
  );
}
