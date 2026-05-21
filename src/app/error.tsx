'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[global error]', error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-background text-foreground">
        <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">出了点问题</h1>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              页面加载遇到错误。可以再试一次，或者返回首页稍后再来看看。
            </p>
            {error.digest ? (
              <p className="text-[11px] text-muted-foreground/70">错误编号：{error.digest}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => reset()}>
              <RotateCw className="mr-2 h-4 w-4" />
              再试一次
            </Button>
            <Button asChild variant="outline">
              <Link href="/feed">
                <Home className="mr-2 h-4 w-4" />
                返回首页
              </Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
