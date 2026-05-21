'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CommentWithAuthor, ReactionSummary } from '@/types/domain';
import { CommentItem } from './CommentItem';
import { DEPTH_BORDER_COLORS, MAX_COMMENT_DEPTH } from './constants';

export interface CommentChildrenProps {
  parentId: string;
  postId: string;
  depth: number;
  childCount: number;
  items: CommentWithAuthor[];
  viewerId: string | null;
  isPostAuthor: boolean;
  isQuestion: boolean;
  acceptedAnswerId: string | null;
  reactionsByComment?: Record<string, ReactionSummary[]>;
  collapsed: Set<string>;
  onToggleCollapsed: (id: string) => void;
}

export function CommentChildren({
  parentId,
  postId,
  depth,
  childCount,
  items,
  viewerId,
  isPostAuthor,
  isQuestion,
  acceptedAnswerId,
  reactionsByComment,
  collapsed,
  onToggleCollapsed,
}: CommentChildrenProps) {
  const exceedsDepth = depth >= MAX_COMMENT_DEPTH;

  if (exceedsDepth) {
    return (
      <Link
        href={`/posts/${postId}/c/${parentId}`}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--brand-500))] hover:underline"
      >
        继续讨论（{childCount} 条回复）
        <ArrowRight className="h-3 w-3" />
      </Link>
    );
  }

  return (
    <ul
      className={cn(
        'mt-3 space-y-3 border-l pl-3',
        DEPTH_BORDER_COLORS[depth % DEPTH_BORDER_COLORS.length]
      )}
    >
      {items.map((child) => (
        <CommentItem
          key={child.id}
          comment={child}
          postId={postId}
          depth={depth + 1}
          viewerId={viewerId}
          isPostAuthor={isPostAuthor}
          isQuestion={isQuestion}
          acceptedAnswerId={acceptedAnswerId}
          reactionsByComment={reactionsByComment}
          collapsed={collapsed}
          onToggleCollapsed={onToggleCollapsed}
        />
      ))}
    </ul>
  );
}
