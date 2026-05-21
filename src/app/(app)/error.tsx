'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[app error]', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-lg border border-dashed bg-muted/20 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-7 w-7 text-destructive" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold">加载失败</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          这个页面暂时打不开。请稍后重试，或返回首页继续浏览其他内容。
        </p>
        {error.digest ? (
          <p className="text-[11px] text-muted-foreground/70">错误编号：{error.digest}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="sm" onClick={() => reset()}>
          <RotateCw className="mr-2 h-4 w-4" />
          再试一次
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/feed">
            <Home className="mr-2 h-4 w-4" />
            返回首页
          </Link>
        </Button>
      </div>
    </div>
  );
}
