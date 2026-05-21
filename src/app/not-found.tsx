import Link from 'next/link';
import { Search, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center gap-8 overflow-hidden bg-background px-6 py-20 text-center">
      {/* decorative gradient blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-gradient-soft blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 translate-x-1/3 translate-y-1/3 rounded-full bg-brand-gradient opacity-10 blur-3xl"
      />

      <div className="relative">
        <svg
          width="180"
          height="180"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="drop-shadow-[0_8px_32px_hsl(var(--brand-500)/0.35)]"
        >
          <defs>
            <linearGradient id="nf-g1" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="hsl(var(--brand-500))" />
              <stop offset="100%" stopColor="hsl(var(--brand-accent-500))" />
            </linearGradient>
          </defs>
          {/* outer ring */}
          <circle
            cx="100"
            cy="100"
            r="78"
            fill="none"
            stroke="url(#nf-g1)"
            strokeWidth="4"
            strokeDasharray="6 10"
            opacity="0.65"
          />
          {/* inner disc */}
          <circle cx="100" cy="100" r="58" fill="url(#nf-g1)" opacity="0.12" />
          {/* compass needle */}
          <path
            d="M100 52 L112 100 L100 148 L88 100 Z"
            fill="url(#nf-g1)"
          />
          <circle cx="100" cy="100" r="6" fill="hsl(var(--background))" stroke="url(#nf-g1)" strokeWidth="3" />
          {/* tick marks */}
          <g stroke="hsl(var(--brand-500))" strokeWidth="2" strokeLinecap="round" opacity="0.55">
            <line x1="100" y1="20" x2="100" y2="30" />
            <line x1="100" y1="170" x2="100" y2="180" />
            <line x1="20" y1="100" x2="30" y2="100" />
            <line x1="170" y1="100" x2="180" y2="100" />
          </g>
        </svg>
      </div>

      <div className="relative space-y-3">
        <div className="text-display text-brand-gradient">404</div>
        <h1 className="text-h2">迷路了？</h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          我们找不到这个页面。可能链接已过期，或者这片讨论还没出现在临介社区。
        </p>
      </div>

      <div className="relative flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/feed">
            <Home className="mr-2 h-4 w-4" />
            回到首页
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/search">
            <Search className="mr-2 h-4 w-4" />
            去搜索
          </Link>
        </Button>
      </div>

      <p className="relative text-xs text-muted-foreground">
        提示：按 <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">Cmd</kbd>
        <span className="mx-0.5">+</span>
        <kbd className="rounded border bg-muted px-1 py-0.5 text-[10px]">K</kbd> 打开命令面板快速跳转。
      </p>
    </div>
  );
}
