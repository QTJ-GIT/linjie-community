'use client';

import { useMemo, useState, useTransition } from 'react';
import { Check, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatRelative } from '@/lib/utils';
import { votePoll, unvotePoll } from '@/actions/polls';

export interface PollViewOption {
  id: string;
  idx: number;
  text: string;
  count: number;
  votedByMe: boolean;
}

export interface PollViewProps {
  pollId: string; // == post_id
  multiple: boolean;
  closes_at: string | null;
  options: PollViewOption[];
  currentUserId?: string | null;
  className?: string;
}

export function PollView({
  pollId,
  multiple,
  closes_at,
  options,
  currentUserId = null,
  className,
}: PollViewProps) {
  const [items, setItems] = useState<PollViewOption[]>(options);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const closed = useMemo(
    () => !!closes_at && new Date(closes_at).getTime() < Date.now(),
    [closes_at],
  );
  const total = items.reduce((n, o) => n + o.count, 0);

  function optimisticToggle(optionId: string): {
    revert: () => void;
    target: PollViewOption | null;
    action: 'vote' | 'unvote';
  } {
    let action: 'vote' | 'unvote' = 'vote';
    let snapshot: PollViewOption[] = [];
    setItems((cur) => {
      snapshot = cur;
      const target = cur.find((o) => o.id === optionId);
      if (!target) return cur;
      if (target.votedByMe) {
        action = 'unvote';
        return cur.map((o) =>
          o.id === optionId ? { ...o, votedByMe: false, count: Math.max(0, o.count - 1) } : o,
        );
      }
      action = 'vote';
      if (multiple) {
        return cur.map((o) =>
          o.id === optionId ? { ...o, votedByMe: true, count: o.count + 1 } : o,
        );
      }
      // single-choice: unvote any existing and vote the new one
      return cur.map((o) => {
        if (o.id === optionId) return { ...o, votedByMe: true, count: o.count + 1 };
        if (o.votedByMe) return { ...o, votedByMe: false, count: Math.max(0, o.count - 1) };
        return o;
      });
    });
    return {
      revert: () => setItems(snapshot),
      target: items.find((o) => o.id === optionId) ?? null,
      action,
    };
  }

  function onClick(optionId: string) {
    if (!currentUserId) {
      toast.error('请先登录');
      return;
    }
    if (closed) {
      toast.error('投票已结束');
      return;
    }
    const target = items.find((o) => o.id === optionId);
    if (!target) return;

    const { revert, action } = optimisticToggle(optionId);
    setBusyId(optionId);

    startTransition(async () => {
      // For single-choice when switching between options, we need to unvote prior first
      if (!multiple && action === 'vote') {
        const prior = items.find((o) => o.votedByMe && o.id !== optionId);
        if (prior) {
          const un = await unvotePoll({ pollId, optionId: prior.id });
          if (!un.ok) {
            revert();
            setBusyId(null);
            toast.error(un.error);
            return;
          }
        }
      }
      const res =
        action === 'vote'
          ? await votePoll({ pollId, optionId })
          : await unvotePoll({ pollId, optionId });
      setBusyId(null);
      if (!res.ok) {
        revert();
        toast.error(res.error);
      }
    });
  }

  return (
    <div className={cn('rounded-md border bg-card p-3', className)}>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {multiple ? '多选投票' : '单选投票'} · {total} 票
        </span>
        {closes_at ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {closed ? '已结束' : `截止于 ${formatRelative(closes_at)}`}
          </span>
        ) : null}
      </div>
      <ul className="space-y-1.5">
        {items
          .slice()
          .sort((a, b) => a.idx - b.idx)
          .map((o) => {
            const pct = total > 0 ? Math.round((o.count / total) * 100) : 0;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  disabled={pending && busyId === o.id}
                  onClick={() => onClick(o.id)}
                  aria-pressed={o.votedByMe}
                  className={cn(
                    'group relative block w-full overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:opacity-60',
                    o.votedByMe
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:bg-accent',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'absolute inset-y-0 left-0 transition-all',
                      o.votedByMe ? 'bg-primary/15' : 'bg-muted',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                  <span className="relative flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      {o.votedByMe ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <span className="inline-block h-4 w-4 rounded-full border border-border" />
                      )}
                      <span className="truncate">{o.text}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                      {o.count} · {pct}%
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
