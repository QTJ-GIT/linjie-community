'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, Search, X, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Sidebar } from '@/components/shell/Sidebar';
import { CommandPalette } from '@/components/command-palette';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Logo } from '@/components/shell/Logo';
// Owned by Agent A. If this import fails during Phase 1 typecheck, that's an
// expected cross-agent gap — it will be reconciled in Phase 2.
import { UserMenu } from '@/components/shell/UserMenu';

type Props = {
  isSignedIn: boolean;
};

export function Navbar({ isSignedIn }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/60'
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={mobileOpen ? '关闭菜单' : '打开菜单'}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <Link
            href="/feed"
            aria-label="临介社区首页"
            className="flex items-center rounded-md px-1 py-1 transition-opacity hover:opacity-90"
          >
            <Logo full size={28} />
          </Link>

          <div className="ml-4 hidden flex-1 md:block">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPaletteOpen(true)}
              aria-label="搜索"
              className="h-9 w-full max-w-md justify-start gap-2 text-muted-foreground"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 text-left text-sm">搜索帖子、股票…</span>
              <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 text-[10px]">
                ⌘K
              </kbd>
            </Button>
          </div>

          <div className="ml-auto flex items-center gap-1">
            {/* 管理后台入口 — 低调图标，悬停显示提示 */}
            <Link
              href="/admin-login"
              title="管理后台"
              aria-label="管理后台"
              className="rounded-md p-1.5 text-muted-foreground/30 transition-colors hover:text-muted-foreground/70"
            >
              <ShieldCheck className="h-4 w-4" />
            </Link>
            {isSignedIn ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="搜索"
                  onClick={() => setPaletteOpen(true)}
                >
                  <Search className="h-5 w-5" />
                </Button>
                <span className="hidden md:inline-flex">
                  <ThemeToggle />
                </span>
                <NotificationBell />
                <UserMenu />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Link
                  href="/login"
                  className="rounded-md px-3 py-1.5 text-sm hover:bg-accent"
                >
                  登录
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 top-16 z-30 md:hidden">
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[240px] border-r border-border bg-background px-3 shadow-lg">
            <Sidebar />
          </div>
        </div>
      )}

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
