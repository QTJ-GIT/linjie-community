'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ReactionSummary } from '@/types/domain';

type TargetType = 'post' | 'comment' | 'chat_message';

export interface UseReactionsOptions {
  targetType: TargetType;
  targetId: string;
  currentUserId: string | null;
  initial: ReactionSummary[];
}

export interface UseReactionsResult {
  summaries: ReactionSummary[];
  applyLocalToggle: (emoji: string) => 'added' | 'removed';
  revertLocalToggle: (emoji: string, prev: 'added' | 'removed') => void;
}

/**
 * Keeps reaction summaries for a single target in sync with Realtime.
 * Provides optimistic toggle helpers.
 */
export function useReactions({
  targetType,
  targetId,
  currentUserId,
  initial,
}: UseReactionsOptions): UseReactionsResult {
  const [summaries, setSummaries] = useState<ReactionSummary[]>(initial);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    setSummaries(initial);
  }, [initial]);

  useEffect(() => {
    const channelName = `reactions:${targetType}:${targetId}`;
    const ch = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `target_id=eq.${targetId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as
            | { target_type?: string; emoji?: string; user_id?: string }
            | undefined;
          if (!row || row.target_type !== targetType || !row.emoji) return;
          const emoji = row.emoji;
          const isSelf = currentUserId != null && row.user_id === currentUserId;
          if (payload.eventType === 'INSERT') {
            setSummaries((prev) => {
              const found = prev.find((s) => s.emoji === emoji);
              if (found) {
                return prev.map((s) =>
                  s.emoji === emoji
                    ? { ...s, count: s.count + 1, reactedByMe: isSelf ? true : s.reactedByMe }
                    : s,
                );
              }
              return [...prev, { emoji, count: 1, reactedByMe: isSelf }];
            });
          } else if (payload.eventType === 'DELETE') {
            setSummaries((prev) =>
              prev
                .map((s) =>
                  s.emoji === emoji
                    ? {
                        ...s,
                        count: Math.max(0, s.count - 1),
                        reactedByMe: isSelf ? false : s.reactedByMe,
                      }
                    : s,
                )
                .filter((s) => s.count > 0),
            );
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, targetType, targetId, currentUserId]);

  const applyLocalToggle = useCallback(
    (emoji: string): 'added' | 'removed' => {
      let result: 'added' | 'removed' = 'added';
      setSummaries((prev) => {
        const found = prev.find((s) => s.emoji === emoji);
        if (found?.reactedByMe) {
          result = 'removed';
          return prev
            .map((s) =>
              s.emoji === emoji ? { ...s, count: Math.max(0, s.count - 1), reactedByMe: false } : s,
            )
            .filter((s) => s.count > 0);
        }
        result = 'added';
        if (found) {
          return prev.map((s) =>
            s.emoji === emoji ? { ...s, count: s.count + 1, reactedByMe: true } : s,
          );
        }
        return [...prev, { emoji, count: 1, reactedByMe: true }];
      });
      return result;
    },
    [],
  );

  const revertLocalToggle = useCallback(
    (emoji: string, prev: 'added' | 'removed') => {
      // Reverse the previous optimistic change
      setSummaries((cur) => {
        const found = cur.find((s) => s.emoji === emoji);
        if (prev === 'added') {
          // had been added -> need to remove
          if (!found) return cur;
          return cur
            .map((s) =>
              s.emoji === emoji ? { ...s, count: Math.max(0, s.count - 1), reactedByMe: false } : s,
            )
            .filter((s) => s.count > 0);
        }
        // had been removed -> re-add
        if (found) {
          return cur.map((s) =>
            s.emoji === emoji ? { ...s, count: s.count + 1, reactedByMe: true } : s,
          );
        }
        return [...cur, { emoji, count: 1, reactedByMe: true }];
      });
    },
    [],
  );

  return { summaries, applyLocalToggle, revertLocalToggle };
}
