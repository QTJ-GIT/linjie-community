# Group M — Performance Integration Memo

Scope: performance deep dive — list virtualization, RSC streaming with
Suspense, lazy Tiptap bundle, `next/image` remote config, and minor
prefetch tuning. All edits were surgical; no file was rewritten wholesale.

## 1. Virtualized lists

Implementation: `@tanstack/react-virtual` v3. Each list keeps its existing
plain render path below a threshold (so unit/integration tests that drive
small fixtures keep working) and only flips into a virtualizer when the
item count grows past it.

| Component | File | Threshold | Notes |
|---|---|---|---|
| `MessageList` (chat room) | `src/components/chat/MessageList.tsx` | > 50 messages | Virtualizes over *message groups* (consecutive messages from the same author within 2 min), not raw messages, to preserve the existing avatar-grouping UX. Dynamic row sizing via `virtualizer.measureElement`. Auto-scrolls to bottom on new messages through a `requestAnimationFrame` write to `scrollTop = scrollHeight`. |
| `DmThread` | `src/components/dm/DmThread.tsx` | > 50 messages | Same auto-scroll-to-bottom trick. Keeps the existing `bottomRef`-driven scroll behavior in the non-virtualized path untouched. |
| `NotificationList` | `src/components/notifications/NotificationList.tsx` | > 30 items | Uses a `max-h-[70vh] overflow-auto` scroll container. Each row stays a `<Link>` so keyboard navigation / middle-click open-in-new-tab still work. |

A generic wrapper lives at `src/components/virtual/VirtualList.tsx` but
each of the three components inlines its virtualizer so that
component-specific behavior (message grouping, right/left DM alignment,
notification rows as links) stays readable. The wrapper is available for
any future list that doesn't need customization.

### Gotchas / caveats

- Virtualization requires a fixed-height *scroll container* ancestor.
  `MessageList` is rendered inside a flex column with `min-h-0 flex-1`
  from the chat shell; `DmThread` sets its own `h-[calc(100vh-10rem)]`.
  Don't nest another scrollbar inside.
- Dynamic measurement means the very first paint may slightly reflow as
  rows measure. This is visually identical to the non-virtualized path
  for lists near the threshold.
- Keyboard shortcuts in chat (Enter / Shift+Enter in the composer) were
  not touched — only the message rendering path changed.

## 2. RSC streaming with Suspense

Page shells now render immediately while the heavy data loads stream in
behind a Suspense boundary.

| Route | Shell (renders first) | Streamed block |
|---|---|---|
| `/feed` (`src/app/(app)/feed/page.tsx`) | `<h1>`, sort tabs, "发新帖" CTA | `<FeedList sort={sort} />` inside `<Suspense fallback={<PostListSkeleton />}>` |
| `/s/[section]` (`src/app/(app)/s/[section]/page.tsx`) | section header, sort tabs | `<FeedList sort={sort} sectionSlug={…} />` |
| `/posts/[id]` (`src/app/(app)/posts/[id]/page.tsx`) | post header + body + vote/share/bookmark/reactions/poll | `<PostComments …/>` inside `<Suspense fallback={<PostCommentsSkeleton />}>` |

New files:

- `src/components/posts/FeedList.tsx` — async server component that
  consolidates the old per-page fetch + enrichment logic. Accepts an
  optional `sectionSlug` so both the global feed and section pages share
  one implementation.
- `src/components/posts/PostListSkeleton.tsx` — matches the shape of
  `PostCard` (avatar, title, two lines of body, vote column).
- `src/components/posts/PostComments.tsx` — async server component that
  loads comments + viewer votes + reactions and renders `CommentTree`.
  Exports `PostCommentsSkeleton` for the fallback.

The only data the page shells still fetch synchronously is
`supabase.auth.getUser()`, because the header CTA ("发新帖") needs to
know whether the viewer is signed in. That call is already warm in the
SSR middleware layer.

### Behavior changes

- Users will see a skeleton for ~100-300ms on cold fetches instead of a
  blank page until everything is ready. Perceived load time is better,
  total time to interactive is roughly unchanged.
- The comment count header (`评论 (N)`) now lives inside the Suspense
  boundary and will appear slightly later than the post body — this is
  intentional and matches the new skeleton.

## 3. Lazy-loaded Tiptap editor

`src/components/editor/TiptapEditorLazy.tsx` wraps `TiptapEditor` in
`next/dynamic` with `ssr: false` and a `<EditorSkeleton>` placeholder.
`src/components/posts/PostForm.tsx` swaps the import to the lazy version.

Why `ssr: false`: Tiptap touches DOM APIs at construction time and can't
render on the server. This also means the editor's JS chunk is fetched
only after hydration, which is the main perf win — users who land on
`/posts/new` but bounce before clicking the editor never download the
~50KB+ chunk.

### Behavior changes

- The editor now shows a gray pulse placeholder for a few hundred ms
  after the form is first mounted, then hydrates. Form validation,
  submit, and draft handling are unchanged — the lazy wrapper is a
  drop-in replacement by component type.
- Because the editor is client-only, any future server-rendered preview
  of post bodies must keep using `PostBody` (which already is an RSC).

## 4. `next/image` configuration

`next.config.mjs` now declares:

```js
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '*.supabase.co' },
    { protocol: 'https', hostname: '*.supabase.in' },
  ],
},
```

This unlocks `<Image>` for Supabase Storage-hosted assets. Audit of
in-list `<img>` usage inside Group M's allowed files turned up only the
Tiptap `image` node in `PostBody` (owned by Group A) and avatar usage
via `AvatarImage` (radix). No surgical `<img>` → `<Image>` swaps were
applied in this pass to avoid touching shared UI primitives owned by
other groups. The config change is a no-op at runtime but enables
follow-up swaps by whichever group owns avatar rendering next.

## 5. Prefetch tuning

`NotificationList` rows now use `<Link prefetch={false}>`. Rationale:
users scrolling a long notification list rarely click most rows, and
the default prefetch-on-viewport behavior produces a burst of `/p/:id`
prefetches. The sidebar was out of scope for this group (owned by J/K)
so its prefetch attributes were left alone.

## 6. Measurement caveats

- Next build was attempted after changes. TypeScript (`npx tsc
  --noEmit`) and ESLint (`npx next lint`) both pass clean. The
  production build currently fails with a Node-builtin resolution error
  coming from `web-push` being imported (transitively, via
  `src/lib/push.ts`) into `src/app/(app)/profile/edit/page.tsx` — this
  is Group L's WIP code and is not produced by any Group M change.
  Recommend re-running `npx next build` once L gates `web-push` behind a
  server-only import.
- Lighthouse numbers will be dominated by the Tiptap defer and the
  feed-page streaming. Expected improvements: smaller initial JS for
  `/posts/new` (no Tiptap in the main bundle), faster TTFB-to-paint for
  `/feed`, `/s/*`, and `/posts/[id]` (shell streams before the DB
  round-trip completes). Raw total load time is roughly unchanged; the
  win is on perceived perf and long-list smoothness.
