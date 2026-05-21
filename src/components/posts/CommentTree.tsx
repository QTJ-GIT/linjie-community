'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { CommentWithAuthor, ReactionSummary } from '@/types/domain';
import { CommentItem } from './comments/CommentItem';

export interface CommentTreeProps {
  postId: string;
  comments: CommentWithAuthor[];
  viewerId: string | null;
  isPostAuthor: boolean;
  isQuestion: boolean;
  acceptedAnswerId: string | null;
  reactionsByComment?: Record<string, ReactionSummary[]>;
  className?: string;
}

export function CommentTree({
  postId,
  comments,
  viewerId,
  isPostAuthor,
  isQuestion,
  acceptedAnswerId,
  reactionsByComment,
  className,
}: CommentTreeProps) {
  const [collapsed, setCollapsed] = React.useState<Set<string>>(() => new Set());

  const toggleCollapsed = React.useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (comments.length === 0) {
    return (
      <p className={cn('py-8 text-center text-sm text-muted-foreground', className)}>
        还没有评论，来做第一个发言者吧。
      </p>
    );
  }
  return (
    <ul className={cn('space-y-4', className)}>
      {comments.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          postId={postId}
          depth={0}
          viewerId={viewerId}
          isPostAuthor={isPostAuthor}
          isQuestion={isQuestion}
          acceptedAnswerId={acceptedAnswerId}
          reactionsByComment={reactionsByComment}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
        />
      ))}
    </ul>
  );
}
