'use client';

import * as React from 'react';
import { UserPlus, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toggleFollowUser } from '@/actions/follows';

export interface FollowButtonProps {
  targetUserId: string;
  currentUserId?: string | null;
  initiallyFollowing: boolean;
  initialFollowerCount?: number;
  className?: string;
}

export function FollowButton({
  targetUserId,
  currentUserId,
  initiallyFollowing,
  initialFollowerCount,
  className,
}: FollowButtonProps) {
  const [following, setFollowing] = React.useState(initiallyFollowing);
  const [followerCount, setFollowerCount] = React.useState(initialFollowerCount ?? 0);
  const [pending, startTransition] = React.useTransition();

  if (currentUserId && currentUserId === targetUserId) {
    return null;
  }

  const onClick = () => {
    const prevFollowing = following;
    const next = !prevFollowing;
    setFollowing(next);
    setFollowerCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const res = await toggleFollowUser(targetUserId);
      if (res.ok) {
        setFollowing(res.following);
        if (res.following !== next) {
          setFollowerCount((c) => c + (res.following ? 1 : -1));
        }
        toast.success(res.following ? '已关注' : '已取消关注');
      } else {
        setFollowing(prevFollowing);
        setFollowerCount((c) => c + (prevFollowing ? 1 : -1) * 1 - (next ? 1 : -1));
        toast.error(res.error);
      }
    });
  };

  return (
    <Button
      type="button"
      variant={following ? 'secondary' : 'default'}
      size="sm"
      onClick={onClick}
      disabled={pending}
      className={cn('gap-1', className)}
      aria-pressed={following}
    >
      {following ? (
        <UserCheck className="h-4 w-4" />
      ) : (
        <UserPlus className="h-4 w-4" />
      )}
      <span>{following ? '已关注' : '关注'}</span>
      {initialFollowerCount !== undefined ? (
        <span className="text-xs text-muted-foreground">· {followerCount}</span>
      ) : null}
    </Button>
  );
}
