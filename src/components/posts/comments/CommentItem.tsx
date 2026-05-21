'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CommentForm } from '../CommentForm';
import { ReactionBar } from '@/components/reactions/ReactionBar';
import { cn } from '@/lib/utils';
import { setAcceptedAnswer } from '@/actions/answers';
import type { CommentWithAuthor, ReactionSummary } from '@/types/domain';
import { CommentMeta } from './CommentMeta';
import { CommentActions } from './CommentActions';
import { CommentChildren } from './CommentChildren';

export interface CommentItemProps {
  comment: CommentWithAuthor;
  postId: string;
  depth: number;
  viewerId: string | null;
  isPostAuthor: boolean;
  isQuestion: boolean;
  acceptedAnswerId: string | null;
  reactionsByComment?: Record<string, ReactionSummary[]>;
  collapsed: Set<string>;
  onToggleCollapsed: (id: string) => void;
}

export function CommentItem({
  comment,
  postId,
  depth,
  viewerId,
  isPostAuthor,
  isQuestion,
  acceptedAnswerId,
  reactionsByComment,
  collapsed,
  onToggleCollapsed,
}: CommentItemProps) {
  const router = useRouter();
  const [replying, setReplying] = React.useState(false);
  const [pendingAccept, startAccept] = React.useTransition();

  const isAccepted = comment.is_answer || acceptedAnswerId === comment.id;
  const canAccept =
    isPostAuthor &&
    isQuestion &&
    depth === 0 &&
    !acceptedAnswerId;

  const childCount = comment.children?.length ?? 0;
  const hasChildren = childCount > 0;
  const isCollapsed = collapsed.has(comment.id);

  const summary = comment.is_deleted
    ? '[该评论已被删除]'
    : (comment.body_text ?? '').slice(0, 80) +
      ((comment.body_text?.length ?? 0) > 80 ? '…' : '');

  const onAccept = () => {
    startAccept(async () => {
      const res = await setAcceptedAnswer({ postId, commentId: comment.id });
      if (res.ok) {
        toast.success('已标记为答案');
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  const initials = (comment.author.display_name ?? comment.author.handle ?? '?').slice(0, 1);

  return (
    <li
      id={`c-${comment.id}`}
      className={cn(
        'rounded-lg border border-border/60 bg-card/40 p-3.5 transition-colors',
        'hover:bg-card/70',
        isAccepted && 'border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/8'
      )}
    >
      <div className="flex items-start gap-2.5">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleCollapsed(comment.id)}
            aria-label={isCollapsed ? '展开子评论' : '折叠子评论'}
            aria-expanded={!isCollapsed}
            className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="mt-1 inline-block h-5 w-5 shrink-0" aria-hidden />
        )}

        <Link href={`/profile/${comment.author.handle}`} className="shrink-0">
          <Avatar className="h-8 w-8">
            {comment.author.avatar_url ? (
              <AvatarImage src={comment.author.avatar_url} alt={comment.author.display_name} />
            ) : null}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <CommentMeta
            comment={comment}
            isAccepted={isAccepted}
            isCollapsed={isCollapsed}
            hasChildren={hasChildren}
            childCount={childCount}
          />

          {isCollapsed ? (
            <p className="mt-1 truncate text-sm text-muted-foreground">{summary}</p>
          ) : (
            <>
              {comment.is_deleted ? (
                <p className="mt-1.5 text-sm italic text-muted-foreground">
                  该评论已被删除
                </p>
              ) : (
                <p className="mt-1.5 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-foreground/90">
                  {comment.body_text}
                </p>
              )}
              <CommentActions
                comment={comment}
                viewerId={viewerId}
                canAccept={canAccept}
                pendingAccept={pendingAccept}
                onAccept={onAccept}
                onToggleReply={() => setReplying((v) => !v)}
              />

              <div className="mt-2">
                <ReactionBar
                  targetType="comment"
                  targetId={comment.id}
                  initialReactions={reactionsByComment?.[comment.id] ?? []}
                  currentUserId={viewerId}
                />
              </div>

              {replying ? (
                <div className="mt-3">
                  <CommentForm
                    postId={postId}
                    parentId={comment.id}
                    placeholder={`回复 @${comment.author.handle}…`}
                    autoFocus
                    onDone={() => setReplying(false)}
                    onCancel={() => setReplying(false)}
                  />
                </div>
              ) : null}

              {hasChildren ? (
                <CommentChildren
                  parentId={comment.id}
                  postId={postId}
                  depth={depth}
                  childCount={childCount}
                  items={comment.children!}
                  viewerId={viewerId}
                  isPostAuthor={isPostAuthor}
                  isQuestion={isQuestion}
                  acceptedAnswerId={acceptedAnswerId}
                  reactionsByComment={reactionsByComment}
                  collapsed={collapsed}
                  onToggleCollapsed={onToggleCollapsed}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </li>
  );
}
