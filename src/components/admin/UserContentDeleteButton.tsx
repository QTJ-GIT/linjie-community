'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { softDeleteUserContent } from '@/actions/admin';
import { Trash2, Loader2 } from 'lucide-react';

export function UserContentDeleteButton({ userId, postCount, commentCount }: {
  userId: string;
  postCount: number;
  commentCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const handleClick = () => {
    const total = postCount + commentCount;
    if (total === 0) {
      toast.info('该用户没有帖子或评论可删除');
      return;
    }
    const msg = `确定要批量软删除该用户的 ${postCount} 篇帖子和 ${commentCount} 条评论？\n此操作不可撤销。`;
    if (!confirm(msg)) return;

    startTransition(async () => {
      const res = await softDeleteUserContent(userId);
      if (res.ok) {
        toast.success(`已删除 ${res.data?.posts ?? 0} 篇帖子、${res.data?.comments ?? 0} 条评论`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="destructive"
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
      批量删除内容
    </Button>
  );
}
