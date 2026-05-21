'use client';

import * as React from 'react';
import { Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toggleBookmark } from '@/actions/bookmarks';

export interface BookmarkButtonProps {
  postId: string;
  initiallyBookmarked: boolean;
  className?: string;
}

export function BookmarkButton({
  postId,
  initiallyBookmarked,
  className,
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = React.useState(initiallyBookmarked);
  const [pending, startTransition] = React.useTransition();

  const onClick = () => {
    const next = !bookmarked;
    setBookmarked(next);
    startTransition(async () => {
      const res = await toggleBookmark(postId);
      if (res.ok) {
        setBookmarked(res.data!.bookmarked);
        toast.success(res.data!.bookmarked ? '已收藏' : '已取消收藏');
      } else {
        setBookmarked(bookmarked);
        toast.error(res.error);
      }
    });
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={pending}
      className={cn('gap-1', bookmarked && 'text-amber-500', className)}
      aria-pressed={bookmarked}
    >
      <Bookmark className={cn('h-4 w-4', bookmarked && 'fill-current')} />
      <span className="text-xs">{bookmarked ? '已收藏' : '收藏'}</span>
    </Button>
  );
}
