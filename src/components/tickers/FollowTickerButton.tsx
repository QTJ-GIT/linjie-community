'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { toggleFollowTicker } from '@/actions/follows';

export interface FollowTickerButtonProps {
  symbol: string;
  initiallyFollowing: boolean;
  className?: string;
}

export function FollowTickerButton({
  symbol,
  initiallyFollowing,
  className,
}: FollowTickerButtonProps) {
  const [following, setFollowing] = React.useState(initiallyFollowing);
  const [pending, startTransition] = React.useTransition();

  const onClick = () => {
    const prevFollowing = following;
    const next = !prevFollowing;
    setFollowing(next);
    startTransition(async () => {
      const res = await toggleFollowTicker(symbol);
      if (res.ok) {
        setFollowing(res.following);
        toast.success(res.following ? `已关注 ${symbol}` : `已取消关注 ${symbol}`);
      } else {
        setFollowing(prevFollowing);
        toast.error(res.error);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={following}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60',
        following
          ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
          : 'border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
        className
      )}
    >
      <span>{following ? '✓ 已关注' : '+ 关注'}</span>
    </button>
  );
}
