import { createClient } from '@/lib/supabase/server';
import { CommentTree } from '@/components/posts/CommentTree';
import type { CommentWithAuthor, Profile, ReactionSummary } from '@/types/domain';

type AuthorLite = Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;

function pickAuthor(raw: unknown): AuthorLite {
  if (Array.isArray(raw)) return (raw[0] as AuthorLite) ?? fallback();
  if (raw && typeof raw === 'object') return raw as AuthorLite;
  return fallback();
}
function fallback(): AuthorLite {
  return { id: '', handle: 'unknown', display_name: '未知用户', avatar_url: null };
}

export interface PostCommentsProps {
  postId: string;
  isQuestion: boolean;
  isPostAuthor: boolean;
  acceptedAnswerId: string | null;
  viewerId: string | null;
}

/**
 * Async server component that loads comments + viewer votes + reactions and
 * renders the CommentTree. Intended to be wrapped in <Suspense> so the
 * post body streams in first.
 */
export async function PostComments({
  postId,
  isQuestion,
  isPostAuthor,
  acceptedAnswerId,
  viewerId,
}: PostCommentsProps) {
  const supabase = createClient();

  const { data: commentRows } = await supabase
    .from('comments')
    .select(
      `id, post_id, parent_id, author_id, body_json, body_text, is_answer, is_deleted,
       created_at, updated_at, score,
       author:profiles!comments_author_id_fkey ( id, handle, display_name, avatar_url )`
    )
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  const commentList = (commentRows ?? []) as Array<{
    id: string;
    post_id: string;
    parent_id: string | null;
    author_id: string;
    body_json: Record<string, unknown>;
    body_text: string;
    is_answer: boolean;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    score: number;
    author: unknown;
  }>;

  const commentIds = commentList.map((c) => c.id);

  const commentVotedRows = commentIds.length && viewerId
    ? await supabase
        .from('likes')
        .select('comment_id, value')
        .eq('user_id', viewerId)
        .in('comment_id', commentIds)
        .is('post_id', null)
    : { data: [] as { comment_id: string | null; value: number }[] };

  const commentReactionRows = commentIds.length
    ? await supabase
        .from('reactions')
        .select('target_id, emoji, user_id')
        .eq('target_type', 'comment')
        .in('target_id', commentIds)
    : { data: [] as { target_id: string; emoji: string; user_id: string }[] };

  const reactionsByComment: Record<string, ReactionSummary[]> = {};
  {
    const map = new Map<string, Map<string, { count: number; reactedByMe: boolean }>>();
    for (const r of (commentReactionRows.data ?? []) as Array<{
      target_id: string;
      emoji: string;
      user_id: string;
    }>) {
      let forTarget = map.get(r.target_id);
      if (!forTarget) {
        forTarget = new Map();
        map.set(r.target_id, forTarget);
      }
      const entry = forTarget.get(r.emoji) ?? { count: 0, reactedByMe: false };
      entry.count += 1;
      if (viewerId && r.user_id === viewerId) entry.reactedByMe = true;
      forTarget.set(r.emoji, entry);
    }
    for (const [cid, emojis] of map.entries()) {
      reactionsByComment[cid] = Array.from(emojis.entries()).map(([emoji, v]) => ({
        emoji,
        count: v.count,
        reactedByMe: v.reactedByMe,
      }));
    }
  }

  const cMyVote = new Map<string, 1 | -1 | 0>();
  for (const r of (commentVotedRows.data ?? []) as {
    comment_id: string | null;
    value: number;
  }[]) {
    if (r.comment_id) cMyVote.set(r.comment_id, (r.value as 1 | -1 | 0) ?? 0);
  }

  const byId = new Map<string, CommentWithAuthor>();
  for (const c of commentList) {
    byId.set(c.id, {
      id: c.id,
      post_id: c.post_id,
      parent_id: c.parent_id,
      author_id: c.author_id,
      body_json: c.body_json,
      body_text: c.body_text,
      is_answer: c.is_answer,
      is_deleted: c.is_deleted,
      created_at: c.created_at,
      updated_at: c.updated_at,
      score: c.score ?? 0,
      author: pickAuthor(c.author),
      children: [],
      my_vote: cMyVote.get(c.id) ?? 0,
    });
  }
  const roots: CommentWithAuthor[] = [];
  for (const c of byId.values()) {
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id)!.children!.push(c);
    } else {
      roots.push(c);
    }
  }

  if (isQuestion) {
    roots.sort((a, b) => {
      const aAccepted = a.is_answer || acceptedAnswerId === a.id ? 1 : 0;
      const bAccepted = b.is_answer || acceptedAnswerId === b.id ? 1 : 0;
      if (aAccepted !== bAccepted) return bAccepted - aAccepted;
      if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
      return a.created_at.localeCompare(b.created_at);
    });
  }

  return (
    <>
      <h2 className="text-lg font-semibold">
        评论 <span className="text-muted-foreground">({commentList.length})</span>
      </h2>
      <CommentTree
        postId={postId}
        comments={roots}
        viewerId={viewerId}
        isPostAuthor={isPostAuthor}
        isQuestion={isQuestion}
        acceptedAnswerId={acceptedAnswerId}
        reactionsByComment={reactionsByComment}
      />
    </>
  );
}

export function PostCommentsSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="h-5 w-24 animate-pulse rounded bg-muted" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
