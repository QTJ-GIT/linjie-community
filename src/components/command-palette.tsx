'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Home,
  TrendingUp,
  MessageCircle,
  Bell,
  Bookmark,
  User,
  Sparkles,
  Search,
  Hash,
  CornerDownLeft,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Item =
  | { kind: 'nav'; id: string; label: string; icon: typeof Home; href: string; section: '快速跳转' }
  | { kind: 'search'; id: string; label: string; query: string; section: '搜索' }
  | { kind: 'ticker'; id: string; label: string; symbol: string; market: string; name: string; section: '股票' };

type NavItem = Extract<Item, { kind: 'nav' }>;

const NAV_ITEMS: NavItem[] = [
  { kind: 'nav', id: 'nav-feed', label: '首页（Feed）', icon: Home, href: '/feed', section: '快速跳转' },
  { kind: 'nav', id: 'nav-trending', label: '热门', icon: TrendingUp, href: '/trending', section: '快速跳转' },
  { kind: 'nav', id: 'nav-tickers', label: '股票话题', icon: Sparkles, href: '/tickers', section: '快速跳转' },
  { kind: 'nav', id: 'nav-chat', label: '公共聊天室', icon: MessageCircle, href: '/chat/lobby', section: '快速跳转' },
  { kind: 'nav', id: 'nav-bookmarks', label: '我的收藏', icon: Bookmark, href: '/bookmarks', section: '快速跳转' },
  { kind: 'nav', id: 'nav-notifications', label: '通知', icon: Bell, href: '/notifications', section: '快速跳转' },
  { kind: 'nav', id: 'nav-profile', label: '个人主页', icon: User, href: '/profile', section: '快速跳转' },
];

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [tickers, setTickers] = useState<
    Array<{ symbol: string; market: string; name: string }>
  >([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 打开时清空并聚焦
  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTickers([]);
      // radix 会管理焦点，但我们再兜底一次
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // 股票搜索（防抖）
  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    if (!query) {
      setTickers([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('tickers')
          .select('symbol, market, name')
          .or(`symbol.ilike.%${query}%,name.ilike.%${query}%`)
          .limit(8);
        setTickers((data ?? []) as Array<{ symbol: string; market: string; name: string }>);
      } catch {
        setTickers([]);
      }
    }, 180);
    return () => clearTimeout(handle);
  }, [q, open]);

  const filteredNav = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return NAV_ITEMS;
    return NAV_ITEMS.filter(
      (n) => n.label.toLowerCase().includes(query) || n.href.toLowerCase().includes(query)
    );
  }, [q]);

  const items: Item[] = useMemo(() => {
    const list: Item[] = [...filteredNav];
    const query = q.trim();
    if (query) {
      list.push({
        kind: 'search',
        id: `search-${query}`,
        label: `搜索 "${query}"`,
        query,
        section: '搜索',
      });
    }
    for (const t of tickers) {
      list.push({
        kind: 'ticker',
        id: `ticker-${t.market}-${t.symbol}`,
        label: `$${t.symbol} · ${t.name}`,
        symbol: t.symbol,
        market: t.market,
        name: t.name,
        section: '股票',
      });
    }
    return list;
  }, [filteredNav, q, tickers]);

  // 当 items 变化时重置选中
  useEffect(() => {
    setActive(0);
  }, [items.length, q]);

  // 滚动到活动项
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const execute = (item: Item) => {
    onOpenChange(false);
    if (item.kind === 'nav') {
      router.push(item.href);
    } else if (item.kind === 'search') {
      router.push(`/search?q=${encodeURIComponent(item.query)}`);
    } else {
      router.push(`/tickers/${encodeURIComponent(item.symbol)}`);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(items.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = items[active];
      if (target) execute(target);
    }
  };

  // 将 items 按 section 分组
  const grouped = useMemo(() => {
    const map = new Map<string, Array<{ item: Item; idx: number }>>();
    items.forEach((item, idx) => {
      const list = map.get(item.section) ?? [];
      list.push({ item, idx });
      map.set(item.section, list);
    });
    return Array.from(map.entries());
  }, [items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden p-0">
        <DialogTitle className="sr-only">命令面板</DialogTitle>
        <DialogDescription className="sr-only">
          输入以搜索页面和股票，使用方向键选择，回车确认。
        </DialogDescription>
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKey}
            placeholder="搜索页面、股票或内容…"
            className="flex-1 border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            aria-label="搜索"
          />
          <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">没有匹配项</div>
          ) : (
            grouped.map(([section, entries]) => (
              <div key={section} className="mb-1">
                <div className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {section}
                </div>
                <div className="space-y-0.5">
                  {entries.map(({ item, idx }) => {
                    const isActive = idx === active;
                    const Icon = item.kind === 'nav' ? item.icon : item.kind === 'search' ? Search : Hash;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-idx={idx}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => execute(item)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm outline-none transition-colors',
                          isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {isActive ? (
                          <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="rounded border bg-background px-1 py-0.5">↑</kbd>
              <kbd className="ml-1 rounded border bg-background px-1 py-0.5">↓</kbd> 移动
            </span>
            <span>
              <kbd className="rounded border bg-background px-1 py-0.5">Enter</kbd> 选择
            </span>
            <span>
              <kbd className="rounded border bg-background px-1 py-0.5">Esc</kbd> 关闭
            </span>
          </div>
          <span>
            <kbd className="rounded border bg-background px-1 py-0.5">?</kbd> 查看全部快捷键
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
