import { createClient } from '@/lib/supabase/server';
import type { ReactionSummary } from '@/types/domain';
import { ReactionBar } from './ReactionBar';

export interface ReactionBarServerProps {
  targetType: 'post' | 'comment' | 'chat_message';
  targetId: string;
  className?: string;
}

/**
 * Fetches initial reaction summaries for a target and renders <ReactionBar>.
 * Intended for Server Components (e.g. post detail page, comment trees when SSR'd).
 */
export async function ReactionBarServer({
  targetType,
  targetId,
  className,
}: ReactionBarServerProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from('reactions')
    .select('emoji, user_id')
    .eq('target_type', targetType)
    .eq('target_id', targetId);

  const byEmoji = new Map<string, { count: number; reactedByMe: boolean }>();
  for (const r of rows ?? []) {
    const prev = byEmoji.get(r.emoji as string) ?? { count: 0, reactedByMe: false };
    prev.count += 1;
    if (user && r.user_id === user.id) prev.reactedByMe = true;
    byEmoji.set(r.emoji as string, prev);
  }
  const initial: ReactionSummary[] = Array.from(byEmoji.entries()).map(([emoji, v]) => ({
    emoji,
    count: v.count,
    reactedByMe: v.reactedByMe,
  }));

  return (
    <ReactionBar
      targetType={targetType}
      targetId={targetId}
      initialReactions={initial}
      currentUserId={user?.id ?? null}
      className={className}
    />
  );
}
