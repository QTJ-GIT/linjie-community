-- ============================================================
-- 0002 — Row Level Security policies
-- Run after 0001. Enables RLS on all user-facing tables.
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.sections       enable row level security;
alter table public.posts          enable row level security;
alter table public.comments       enable row level security;
alter table public.likes          enable row level security;
alter table public.bookmarks      enable row level security;
alter table public.tickers        enable row level security;
alter table public.post_tickers   enable row level security;
alter table public.chat_rooms     enable row level security;
alter table public.chat_messages  enable row level security;
alter table public.notifications  enable row level security;

-- ---- profiles ----
drop policy if exists "profiles readable"   on public.profiles;
drop policy if exists "profile insert self" on public.profiles;
drop policy if exists "profile update self" on public.profiles;
create policy "profiles readable"   on public.profiles for select using (true);
create policy "profile insert self" on public.profiles for insert with check (auth.uid() = id);
create policy "profile update self" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---- sections / tickers (read-only to clients) ----
drop policy if exists "sections readable" on public.sections;
drop policy if exists "tickers readable"  on public.tickers;
create policy "sections readable" on public.sections for select using (true);
create policy "tickers readable"  on public.tickers  for select using (true);

-- ---- posts ----
drop policy if exists "posts readable"          on public.posts;
drop policy if exists "posts insert own"        on public.posts;
drop policy if exists "posts update own"        on public.posts;
drop policy if exists "posts delete own"        on public.posts;
create policy "posts readable"   on public.posts for select using (is_deleted = false);
create policy "posts insert own" on public.posts for insert with check (auth.uid() = author_id);
create policy "posts update own" on public.posts for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "posts delete own" on public.posts for delete using (auth.uid() = author_id);

-- ---- comments ----
drop policy if exists "comments readable"     on public.comments;
drop policy if exists "comments insert authed" on public.comments;
drop policy if exists "comments update own"   on public.comments;
drop policy if exists "comments delete own"   on public.comments;
create policy "comments readable"      on public.comments for select using (is_deleted = false);
create policy "comments insert authed" on public.comments for insert with check (auth.uid() = author_id);
create policy "comments update own"    on public.comments for update using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "comments delete own"    on public.comments for delete using (auth.uid() = author_id);

-- ---- likes ----
drop policy if exists "likes readable"    on public.likes;
drop policy if exists "likes insert self" on public.likes;
drop policy if exists "likes delete self" on public.likes;
create policy "likes readable"    on public.likes for select using (true);
create policy "likes insert self" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes delete self" on public.likes for delete using (auth.uid() = user_id);

-- ---- bookmarks (self only) ----
drop policy if exists "bookmarks self select" on public.bookmarks;
drop policy if exists "bookmarks self insert" on public.bookmarks;
drop policy if exists "bookmarks self delete" on public.bookmarks;
create policy "bookmarks self select" on public.bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks self insert" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks self delete" on public.bookmarks for delete using (auth.uid() = user_id);

-- ---- post_tickers: readable; writes only by trigger (security definer) ----
drop policy if exists "post_tickers readable" on public.post_tickers;
create policy "post_tickers readable" on public.post_tickers for select using (true);

-- ---- chat ----
drop policy if exists "chat rooms readable"       on public.chat_rooms;
drop policy if exists "chat messages readable"    on public.chat_messages;
drop policy if exists "chat messages send"        on public.chat_messages;
drop policy if exists "chat messages delete own"  on public.chat_messages;
create policy "chat rooms readable"       on public.chat_rooms    for select using (true);
create policy "chat messages readable"    on public.chat_messages for select using (true);
create policy "chat messages send"        on public.chat_messages for insert with check (auth.uid() = author_id);
create policy "chat messages delete own"  on public.chat_messages for delete using (auth.uid() = author_id);

-- ---- notifications (self only; inserts via trigger) ----
drop policy if exists "notifications self select"     on public.notifications;
drop policy if exists "notifications self mark-read"  on public.notifications;
create policy "notifications self select"    on public.notifications for select using (auth.uid() = recipient_id);
create policy "notifications self mark-read" on public.notifications for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
