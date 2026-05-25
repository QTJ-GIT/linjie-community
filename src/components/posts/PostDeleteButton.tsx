'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { deletePost } from '@/actions/posts';
import { softDeletePost } from '@/actions/admin';

export function PostDeleteButton({
  postId,
  isAuthor,
  isAdmin,
}: {
  postId: string;
  isAuthor: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const handleDelete = () => {
    const msg = isAdmin && !isAuthor
      ? '确定要以管理员身份删除该帖子？'
      : '确定要删除该帖子？删除后不可恢复。';
    if (!confirm(msg)) return;

    startTransition(async () => {
      console.log('[PostDeleteButton] deleting post', postId, 'isAdmin=', isAdmin, 'isAuthor=', isAuthor);
      const res = isAdmin
        ? await softDeletePost(postId)
        : await deletePost(postId);
      console.log('[PostDeleteButton] delete result:', res);
      if (res.ok) {
        toast.success('已删除');
        router.push('/feed');
        router.refresh();
      } else {
        toast.error(res.error || '删除失败');
      }
    });
  };

  if (!isAuthor && !isAdmin) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="gap-1 text-destructive hover:text-destructive"
      onClick={handleDelete}
      disabled={pending}
    >
      <Trash2 className="h-4 w-4" />
      删除
    </Button>
  );
}
