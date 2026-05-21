'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { resolveReport } from '@/actions/admin';

export function ReportActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const act = (action: 'resolve' | 'dismiss') => {
    startTransition(async () => {
      const res = await resolveReport(id, action);
      if (res.ok) {
        toast.success(action === 'resolve' ? '已处理' : '已忽略');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="flex gap-1">
      <Button
        type="button"
        size="sm"
        variant="default"
        disabled={pending}
        onClick={() => act('resolve')}
      >
        解决
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => act('dismiss')}
      >
        忽略
      </Button>
    </div>
  );
}
