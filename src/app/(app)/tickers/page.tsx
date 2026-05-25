import Link from 'next/link';
import type { Metadata } from 'next';
import { LineChart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import type { Ticker } from '@/types/domain';

export const metadata: Metadata = {
  title: '股票话题 · 临介社区',
};

export const dynamic = 'force-dynamic';

const MARKET_LABEL: Record<Ticker['market'], string> = {
  US: '美股',
  CN: 'A股',
};

export default async function TickersIndexPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tickers')
    .select('symbol, market, name')
    .order('market', { ascending: true })
    .order('symbol', { ascending: true });

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="text-sm text-destructive">加载股票列表失败：{error.message}</p>
      </div>
    );
  }

  const tickers = (data ?? []) as Ticker[];
  const grouped = tickers.reduce<Record<Ticker['market'], Ticker[]>>(
    (acc, t) => {
      (acc[t.market] ??= []).push(t);
      return acc;
    },
    { US: [], CN: [] }
  );

  const markets: Ticker['market'][] = ['US', 'CN'];

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <header className="mb-8 flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[hsl(var(--brand-500))]">
          <LineChart className="h-4 w-4" />
          股票频道
        </div>
        <h1 className="text-h1 font-bold tracking-tight">股票话题</h1>
        <p className="text-sm text-muted-foreground">
          每只股票都有独立的讨论流和聊天室。点击进入对应频道。
        </p>
      </header>

      {tickers.length === 0 ? (
        <p className="text-sm text-muted-foreground">暂无股票。</p>
      ) : (
        <div className="space-y-10">
          {markets.map((market) => {
            const list = grouped[market] ?? [];
            if (list.length === 0) return null;
            return (
              <section key={market}>
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-h3 font-semibold tracking-tight">
                    {MARKET_LABEL[market]}
                  </h2>
                  <Badge
                    variant="secondary"
                    className="h-5 px-1.5 py-0 text-[10px] font-mono"
                  >
                    {list.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((t) => (
                    <Link
                      key={t.symbol}
                      href={`/tickers/${encodeURIComponent(t.symbol)}`}
                      className={cn(
                        'group rounded-xl border border-border/60 bg-card p-4 transition-all',
                        'hover:border-border hover:bg-card/80 hover:ring-1 hover:ring-[hsl(var(--brand-500))]/20'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-base font-semibold tracking-tight transition-colors group-hover:text-[hsl(var(--brand-600))] dark:group-hover:text-[hsl(var(--brand-400))]">
                              ${t.symbol}
                            </span>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                              {MARKET_LABEL[t.market]}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {t.name}
                          </p>
                        </div>
                        <span
                          aria-hidden
                          className="text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                        >
                          →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

    </div>
  );
}
