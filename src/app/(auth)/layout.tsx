import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Aurora } from '@/components/effects/Aurora';
import { Logo } from '@/components/shell/Logo';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* 返回键 */}
      <Link
        href="/feed"
        className="absolute left-4 top-4 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        返回
      </Link>

      <div aria-hidden className="absolute inset-0 -z-10 hidden md:block">
        <Aurora intensity={0.4} />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-brand-gradient-soft opacity-40 md:hidden"
      />
      <Link href="/" className="mb-8" aria-label="临介社区首页">
        <Logo full size={32} />
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-background/85 p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70">
        {children}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        投资者的安静角落 · 一个克制的小型社区
      </p>
    </main>
  );
}
