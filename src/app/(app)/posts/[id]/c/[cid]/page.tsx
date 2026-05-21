import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { SITE } from '@/lib/site';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CommentTree } from '@/components/posts/CommentTree';
import { CommentForm } from '@/components/posts/CommentForm';
import { SmartTime } from '@/components/smart-time';
import type { CommentWithAuthor, Profile, ReactionSummary } from '@/types/domain';

export const dynamic = 'force-dynamic';

type AuthorLite = Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;

function pickAuthor(raw: unknown): AuthorLite {
  if (Array.isArray(raw)) return (raw[0] as AuthorLite) ?? fallback();
  if (raw && typeof raw === 'object') return raw as AuthorLite;
  return fallback();
}
function fallback(): AuthorLite {
  return { id: '', handle: 'unknown', display_name: '未知用户', avatar_url: null };
}

/** Raw row shape returned by the comments select used here. */
type CommentRow = {
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
  score: number | null;
  path: string | null;
  depth: number | null;
  child_count: number | null;
  author: unknown;
};

const COMMENT_SELECT = `id, post_id, parent_id, author_id, body_json, body_text, is_answer, is_deleted,
   created_at, updated_at, score, path, depth, child_count,
   author:profiles!comments_author_id_fkey ( id, handle, display_name, avatar_url )`;

/** Convert a CommentRow into a fully-typed CommentWithAuthor (no children yet). */
function toCommentWithAuthor(row: CommentRow): CommentWithAuthor {
  return {
    id: row.id,
    post_id: row.post_id,
    parent_id: row.parent_id,
    author_id: row.author_id,
    body_json: row.body_json,
    body_text: row.body_text,
    is_answer: row.is_answer,
    is_deleted: row.is_deleted,
    created_at: row.created_at,
    updated_at: row.updated_at,
    score: row.score ?? 0,
    path: row.path,
    depth: row.depth,
    child_count: row.child_count,
    author: pickAuthor(row.author),
    children: [],
  };
}

/** Build a tree rooted at `focus`, attaching descendants by parent_id. */
function buildTreeFromPath(
  focus: CommentRow,
  descendants: CommentRow[]
): CommentWithAuthor {
  const root = toCommentWithAuthor(focus);
  const byId = new Map<string, CommentWithAuthor>();
  byId.set(root.id, root);
  for (const d of descendants) byId.set(d.id, toCommentWithAuthor(d));
  // descendants come ordered by path so parents always appear before children.
  for (const d of descendants) {
    const node = byId.get(d.id)!;
    const parentId = d.parent_id;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId)!.children!.push(node);
    } else {
      // Orphan (parent missing — should not normally happen for path-prefixed
      // descendants, but if it does, drop it under the focus root so it's not
      // silently lost).
      root.children!.push(node);
    }
  }
  return root;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string; cid: string };
}): Promise<Metadata> {
  const supabase = createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('title, is_deleted')
    .eq('id', params.id)
    .maybeSingle();

  const row = post as { title?: string; is_deleted?: boolean } | null;
  if (!row || row.is_deleted) {
    return { title: `楼中楼 · ${SITE.name}` };
  }
  return {
    title: `楼中楼 · ${row.title} · ${SITE.name}`,
    robots: { index: false, follow: true },
    alternates: {
      canonical: `${SITE.url}/posts/${params.id}/c/${params.cid}`,
    },
  };
}

export default async function CommentFocusPage({
  params,
}: {
  params: { id: string; cid: string };
}) {
  const { id: postId, cid } = params;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1) Post — minimal columns; just enough for breadcrumb + permission gate.
  const { data: post } = await supabase
    .from('posts')
    .select('id, title, type, section_slug, is_deleted, accepted_answer_id, author_id')
    .eq('id', postId)
    .maybeSingle();

  if (!post || (post as { is_deleted?: boolean }).is_deleted) notFound();

  const typedPost = post as {
    id: string;
    title: string;
    type: 'post' | 'question';
    section_slug: string;
    accepted_answer_id: string | null;
    author_id: string;
  };

  // 2) Focus comment — must belong to this post and have a non-null path.
  const { data: focusRaw } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('id', cid)
    .eq('post_id', postId)
    .maybeSingle();

  const focus = focusRaw as CommentRow | null;
  if (!focus || !focus.path) notFound();

  // 3) Descendants via path prefix (covered by comments_path_idx).
  const { data: descendantRows } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('post_id', postId)
    .like('path', `${focus.path}.%`)
    .order('path', { ascending: true });

  const descendants = (descendantRows ?? []) as CommentRow[];

  // 4) Ancestors (excluding focus itself) for breadcrumb-style summary.
  const pathParts = focus.path.split('.');
  const ancestorIds = pathParts.slice(0, -1);
  const { data: ancestorRows } = ancestorIds.length
    ? await supabase
        .from('comments')
        .select(COMMENT_SELECT)
        .eq('post_id', postId)
        .in('id', ancestorIds)
    : { data: [] as CommentRow[] };

  // Order ancestors top-down to match the path chain.
  const ancestorMap = new Map<string, CommentRow>();
  for (const a of (ancestorRows ?? []) as CommentRow[]) ancestorMap.set(a.id, a);
  const ancestors: CommentRow[] = ancestorIds
    .map((aid) => ancestorMap.get(aid))
    .filter((x): x is CommentRow => Boolean(x));

  // 5) Viewer-specific: my_vote on focus + descendants.
  const subtreeIds = [focus.id, ...descendants.map((d) => d.id)];
  const myVoteRows = user && subtreeIds.length
    ? await supabase
        .from('likes')
        .select('comment_id, value')
        .eq('user_id', user.id)
        .in('comment_id', subtreeIds)
        .is('post_id', null)
    : { data: [] as { comment_id: string | null; value: number }[] };

  const myVoteMap = new Map<string, 1 | -1 | 0>();
  for (const r of (myVoteRows.data ?? []) as {
    comment_id: string | null;
    value: number;
  }[]) {
    if (r.comment_id) myVoteMap.set(r.comment_id, (r.value as 1 | -1 | 0) ?? 0);
  }

  // 6) Reactions for the visible subtree.
  const reactionRows = subtreeIds.length
    ? await supabase
        .from('reactions')
        .select('target_id, emoji, user_id')
        .eq('target_type', 'comment')
        .in('target_id', subtreeIds)
    : { data: [] as { target_id: string; emoji: string; user_id: string }[] };

  const reactionsByComment: Record<string, ReactionSummary[]> = {};
  {
    const map = new Map<string, Map<string, { count: number; reactedByMe: boolean }>>();
    for (const r of (reactionRows.data ?? []) as Array<{
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
      if (user?.id && r.user_id === user.id) entry.reactedByMe = true;
      forTarget.set(r.emoji, entry);
    }
    for (const [tid, emojis] of map.entries()) {
      reactionsByComment[tid] = Array.from(emojis.entries()).map(([emoji, v]) => ({
        emoji,
        count: v.count,
        reactedByMe: v.reactedByMe,
      }));
    }
  }

  // 7) Build tree and inject my_vote.
  const focusTree = buildTreeFromPath(focus, descendants);
  const stack: CommentWithAuthor[] = [focusTree];
  while (stack.length) {
    const node = stack.pop()!;
    node.my_vote = myVoteMap.get(node.id) ?? 0;
    if (node.children) stack.push(...node.children);
  }

  const isViewerPostAuthor = user?.id === typedPost.author_id;
  const subtreeSize = descendants.length; // not counting focus itself

  return (
    <div className="mx-auto w-full max-w-[740px] space-y-6 p-4 sm:p-6">
      {/* Breadcrumb */}
      <nav
        aria-label="面包屑"
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Link href="/feed" className="hover:text-foreground">
          /feed
        </Link>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <Link
          href={`/posts/${typedPost.id}`}
          className="max-w-[200px] truncate hover:text-foreground sm:max-w-[320px]"
        >
          {typedPost.title}
        </Link>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-foreground/70">聚焦评论</span>
      </nav>

      {/* Back-to-full-thread CTA */}
      <div>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link href={`/posts/${typedPost.id}#c-${focus.id}`}>
            <ArrowLeft className="h-4 w-4" />
            查看完整讨论
          </Link>
        </Button>
      </div>

      {/* Ancestor chain (collapsed summary) */}
      {ancestors.length > 0 ? (
        <aside
          aria-label="上文"
          className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs"
        >
          <div className="mb-2 font-medium text-muted-foreground">
            上文（{ancestors.length} 条）
          </div>
          <ul className="space-y-1.5">
            {ancestors.map((a) => {
              const author = pickAuthor(a.author);
              const preview = a.is_deleted
                ? '[该评论已被删除]'
                : (a.body_text ?? '').replace(/\s+/g, ' ').trim().slice(0, 80) +
                  ((a.body_text?.length ?? 0) > 80 ? '…' : '');
              return (
                <li key={a.id} className="flex items-baseline gap-2">
                  <Link
                    href={`/posts/${typedPost.id}#c-${a.id}`}
                    className="shrink-0 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    @{author.handle}
                  </Link>
                  <SmartTime
                    iso={a.created_at}
                    className="shrink-0 font-mono text-[10px] text-muted-foreground/70"
                  />
                  <Link
                    href={`/posts/${typedPost.id}#c-${a.id}`}
                    className="min-w-0 flex-1 truncate text-muted-foreground hover:text-foreground"
                  >
                    {preview}
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>
      ) : null}

      <Separator className="bg-border/60" />

      {/* Focus subtree header */}
      <header className="space-y-1">
        <h1 className="text-h3 font-semibold tracking-tight">楼中楼</h1>
        <p className="text-xs text-muted-foreground">
          以这条评论为根，展开 {subtreeSize} 条回复。
        </p>
      </header>

      {/* Re-use the existing client component to render the focused subtree. */}
      <CommentTree
        postId={typedPost.id}
        comments={[focusTree]}
        viewerId={user?.id ?? null}
        isPostAuthor={isViewerPostAuthor}
        isQuestion={typedPost.type === 'question'}
        acceptedAnswerId={typedPost.accepted_answer_id}
        reactionsByComment={reactionsByComment}
      />

      {/* Reply box — replies here go under the focus comment. */}
      {user ? (
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <CommentForm postId={typedPost.id} parentId={focus.id} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
            登录
          </Link>{' '}
          后可以回复这条评论。
        </p>
      )}
    </div>
  );
}
