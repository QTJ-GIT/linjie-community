# Group C — Integration Memo

Components and hooks owned by Group C are ready. They are additive and self-contained;
Agents A & B only need to mount the wrappers in the indicated spots.

## 1. ReactionBar

Use `<ReactionBarServer>` in Server Components, `<ReactionBar>` in Client Components.

### PostCard (client) — under action row / above comment link:
```tsx
import { ReactionBar } from '@/components/reactions/ReactionBar';
// ...inside render, needs `initialReactions` prefetched by feed query:
<ReactionBar targetType="post" targetId={post.id} initialReactions={post.reactions ?? []} currentUserId={currentUserId} />
```

### CommentTree — at the end of each comment body block:
```tsx
<ReactionBar targetType="comment" targetId={comment.id} initialReactions={comment.reactions ?? []} currentUserId={currentUserId} />
```

### MessageList — below each message bubble (inside the inner `.flex.flex-col.gap-1` map over `g.items`):
```tsx
<ReactionBar targetType="chat_message" targetId={m.id} initialReactions={m.reactions ?? []} currentUserId={currentUserId} className="mt-0.5" />
```
Chat `MessageList` currently has no `currentUserId`; either accept it via new prop or import a client context. If skipped, still works (read-only). Realtime keeps counts fresh.

For post-detail SSR, use the server wrapper — no prefetch needed:
```tsx
import { ReactionBarServer } from '@/components/reactions/ReactionBarServer';
<ReactionBarServer targetType="post" targetId={post.id} />
```

## 2. PollView below post body (posts/[id]/page.tsx — Agent A's file)
```tsx
import { PollSection } from '@/components/polls/PollSection';
// Below the post body, before comments:
{/* TODO(groupC): integration hook */}
<PollSection postId={post.id} isAuthor={post.author_id === user?.id} />
```
Authors without a poll see an "添加投票" link to `/posts/[id]/poll`.

## 3. ChatRoom presence + typing
Already wired in `ChatRoom.tsx` (surgical edit): `PresenceBadge` in header, `TypingIndicator` above the textarea, `sendTyping()` called from textarea `onChange`. No further action required.
