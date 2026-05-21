import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PollView, type PollViewOption } from './PollView';

export interface PollSectionProps {
  postId: string;
  /** true when viewer authored the post (shows manage link) */
  isAuthor?: boolean;
}

/**
 * Server component to render a poll attached to a post, if any.
 * Intended to be dropped below the post body in posts/[id]/page.tsx (Agent A).
 */
export async function PollSection({ postId, isAuthor }: PollSectionProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: poll } = await supabase
    .from('polls')
    .select('post_id, multiple, closes_at')
    .eq('post_id', postId)
    .maybeSingle();

  if (!poll) {
    if (isAuthor) {
      return (
        <div className="rounded-md border bg-card p-3 text-sm text-muted-foreground">
          尚未附加投票。
          <Link href={`/posts/${postId}/poll`} className="ml-2 text-primary hover:underline">
            添加投票 →
          </Link>
        </div>
      );
    }
    return null;
  }

  const { data: options } = await supabase
    .from('poll_options')
    .select('id, idx, text')
    .eq('poll_id', postId)
    .order('idx', { ascending: true });

  const { data: votes } = await supabase
    .from('poll_votes')
    .select('option_id, user_id')
    .eq('poll_id', postId);

  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const v of votes ?? []) {
    counts.set(v.option_id as string, (counts.get(v.option_id as string) ?? 0) + 1);
    if (user && v.user_id === user.id) mine.add(v.option_id as string);
  }

  const viewOptions: PollViewOption[] = (options ?? []).map((o) => ({
    id: o.id as string,
    idx: o.idx as number,
    text: o.text as string,
    count: counts.get(o.id as string) ?? 0,
    votedByMe: mine.has(o.id as string),
  }));

  return (
    <PollView
      pollId={postId}
      multiple={poll.multiple as boolean}
      closes_at={(poll.closes_at as string | null) ?? null}
      options={viewOptions}
      currentUserId={user?.id ?? null}
    />
  );
}
