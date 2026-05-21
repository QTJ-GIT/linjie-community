'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { pinPost, softDeletePost } from '@/actions/admin';

export function PostModActions({
  postId,
  isPinned,
  isDeleted,
}: {
  postId: string;
  isPinned: boolean;
  isDeleted: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const togglePin = () => {
    startTransition(async () => {
      const res = await pinPost(postId, !isPinned);
      if (res.ok) {
        toast.success(!isPinned ? '已置顶' : '已取消置顶');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const doDelete = () => {
    if (!confirm('确定要软删除该帖子？')) return;
    startTransition(async () => {
      const res = await softDeletePost(postId);
      if (res.ok) {
        toast.success('已删除');
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
        variant={isPinned ? 'outline' : 'default'}
        onClick={togglePin}
        disabled={pending}
      >
        {isPinned ? '取消置顶' : '置顶'}
      </Button>
      {!isDeleted ? (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={doDelete}
          disabled={pending}
        >
          删除
        </Button>
      ) : null}
    </div>
  );
}
