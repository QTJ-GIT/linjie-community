'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { toggleReaction } from '@/actions/reactions';
import type { ReactionSummary } from '@/types/domain';
import { useReactions } from '@/hooks/useReactions';
import { ReactionPicker } from './ReactionPicker';

export interface ReactionBarProps {
  targetType: 'post' | 'comment' | 'chat_message';
  targetId: string;
  initialReactions: ReactionSummary[];
  currentUserId?: string | null;
  className?: string;
}

export function ReactionBar({
  targetType,
  targetId,
  initialReactions,
  currentUserId = null,
  className,
}: ReactionBarProps) {
  const { summaries, applyLocalToggle, revertLocalToggle } = useReactions({
    targetType,
    targetId,
    currentUserId,
    initial: initialReactions,
  });
  const [pending, startTransition] = useTransition();
  const [busyEmoji, setBusyEmoji] = useState<string | null>(null);

  function onPick(emoji: string) {
    if (!currentUserId) {
      toast.error('请先登录');
      return;
    }
    const prev = applyLocalToggle(emoji);
    setBusyEmoji(emoji);
    startTransition(async () => {
      const res = await toggleReaction({ target_type: targetType, target_id: targetId, emoji });
      setBusyEmoji(null);
      if (!res.ok) {
        revertLocalToggle(emoji, prev);
        toast.error(res.error);
      }
    });
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {summaries.map((s) => (
        <button
          key={s.emoji}
          type="button"
          disabled={pending && busyEmoji === s.emoji}
          onClick={() => onPick(s.emoji)}
          className={cn(
            'inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs transition-colors disabled:opacity-60',
            s.reactedByMe
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border bg-background hover:bg-accent',
          )}
          aria-pressed={s.reactedByMe}
          aria-label={`${s.emoji} ${s.count}`}
        >
          <span className="text-sm leading-none">{s.emoji}</span>
          <span className="tabular-nums">{s.count}</span>
        </button>
      ))}
      <ReactionPicker onPick={onPick} disabled={!currentUserId} />
    </div>
  );
}
