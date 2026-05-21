'use client';

import { Check, CornerDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoteButtons } from '../VoteButtons';
import { ReportButton } from '@/components/reports/ReportButton';
import type { CommentWithAuthor } from '@/types/domain';

export interface CommentActionsProps {
  comment: CommentWithAuthor;
  viewerId: string | null;
  canAccept: boolean;
  pendingAccept: boolean;
  onAccept: () => void;
  onToggleReply: () => void;
}

export function CommentActions({
  comment,
  viewerId,
  canAccept,
  pendingAccept,
  onAccept,
  onToggleReply,
}: CommentActionsProps) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1">
      <VoteButtons
        targetType="comment"
        targetId={comment.id}
        initialScore={comment.score ?? 0}
        initialMyVote={comment.my_vote ?? 0}
        orientation="horizontal"
      />
      {viewerId ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleReply}
          className="gap-1"
        >
          <CornerDownRight className="h-4 w-4" />
          <span className="text-xs">回复</span>
        </Button>
      ) : null}
      {canAccept ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAccept}
          disabled={pendingAccept}
          className="gap-1"
        >
          <Check className="h-4 w-4" />
          <span className="text-xs">标记为答案</span>
        </Button>
      ) : null}
      {viewerId && !comment.is_deleted ? (
        <ReportButton targetType="comment" targetId={comment.id} />
      ) : null}
    </div>
  );
}
