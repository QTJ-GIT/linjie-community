'use client';

import * as React from 'react';
import { Heart, Star, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { toggleTeachingLike, toggleTeachingBookmark } from '@/actions/teaching-social';

interface TeachingActionBarProps {
  resourceId: string;
  initialLiked: boolean;
  initialLikeCount: number;
  initialBookmarked: boolean;
  isLoggedIn: boolean;
}

export function TeachingActionBar({
  resourceId,
  initialLiked,
  initialLikeCount,
  initialBookmarked,
  isLoggedIn,
}: TeachingActionBarProps) {
  const [liked, setLiked] = React.useState(initialLiked);
  const [likeCount, setLikeCount] = React.useState(initialLikeCount);
  const [bookmarked, setBookmarked] = React.useState(initialBookmarked);
  const [liking, setLiking] = React.useState(false);
  const [bookmarking, setBookmarking] = React.useState(false);

  async function handleLike() {
    if (!isLoggedIn) { toast.error('请先登录'); return; }
    const nextLiked = !liked;
    const nextCount = nextLiked ? likeCount + 1 : likeCount - 1;
    setLiked(nextLiked);
    setLikeCount(nextCount);
    setLiking(true);
    try {
      const res = await toggleTeachingLike(resourceId);
      if (!res.ok) {
        // 回滚乐观更新
        setLiked(liked);
        setLikeCount(likeCount);
        toast.error(res.error);
      } else if (res.data) {
        setLiked(res.data.liked);
        setLikeCount(res.data.likeCount);
      }
    } finally {
      setLiking(false);
    }
  }

  async function handleBookmark() {
    if (!isLoggedIn) { toast.error('请先登录'); return; }
    setBookmarked((v) => !v);
    setBookmarking(true);
    try {
      const res = await toggleTeachingBookmark(resourceId);
      if (!res.ok) {
        setBookmarked((v) => !v);
        toast.error(res.error);
      } else {
        toast.success(bookmarked ? '已取消收藏' : '已收藏');
      }
    } finally {
      setBookmarking(false);
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success('链接已复制');
    });
  }

  return (
    <div className="flex items-center justify-center gap-8 border-t border-b border-border/60 py-5 my-8">
      {/* 点赞 */}
      <button
        type="button"
        onClick={handleLike}
        disabled={liking}
        className={cn(
          'flex flex-col items-center gap-1.5 text-xs transition-colors',
          liked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-400'
        )}
      >
        <Heart
          className={cn('h-7 w-7 transition-all', liked && 'fill-rose-500')}
        />
        <span>{likeCount > 0 ? likeCount : '点赞'}</span>
      </button>

      {/* 收藏 */}
      <button
        type="button"
        onClick={handleBookmark}
        disabled={bookmarking}
        className={cn(
          'flex flex-col items-center gap-1.5 text-xs transition-colors',
          bookmarked ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-400'
        )}
      >
        <Star
          className={cn('h-7 w-7 transition-all', bookmarked && 'fill-amber-500')}
        />
        <span>{bookmarked ? '已收藏' : '收藏'}</span>
      </button>

      {/* 分享 */}
      <button
        type="button"
        onClick={handleShare}
        className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Share2 className="h-7 w-7" />
        <span>分享</span>
      </button>
    </div>
  );
}
