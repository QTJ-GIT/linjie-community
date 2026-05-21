-- ============================================================
-- 0001 — init schema
-- Paste into Supabase SQL Editor and run. Safe to re-run.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;
create extension if not exists citext;

-- ==========================================================
-- PROFILES (1:1 with auth.users)
-- ==========================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  handle        citext unique not null,
  display_name  text not null,
  avatar_url    text,
  bio           text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists profiles_handle_idx on public.profiles (handle);

-- ==========================================================
-- SECTIONS (static lookup)
-- ==========================================================
create table if not exists public.sections (
  slug         text primary key,
  name         text not null,
  description  text
);
insert into public.sections (slug, name, description) values
  ('general', '综合讨论', '开放式交流'),
  ('qa',      '问答',     '提问与作答'),
  ('stocks',  '股票话题', '股票相关讨论')
on conflict (slug) do nothing;

-- ==========================================================
-- POSTS
-- ==========================================================
do $$ begin
  create type post_type as enum ('post', 'question');
exception when duplicate_object then null; end $$;

create table if not exists public.posts (
  id                  uuid primary key default uuid_generate_v4(),
  author_id           uuid not null references public.profiles(id) on delete cascade,
  section_slug        text not null references public.sections(slug),
  type                post_type not null default 'post',
  title               text not null check (char_length(title) between 3 and 200),
  body_json           jsonb not null,
  body_text           text not null,
  accepted_answer_id  uuid,
  is_deleted          boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists posts_section_created_idx on public.posts (section_slug, created_at desc);
create index if not exists posts_author_idx          on public.posts (author_id, created_at desc);
create index if not exists posts_body_trgm_idx       on public.posts using gin (body_text gin_trgm_ops);

-- ==========================================================
-- COMMENTS
-- ==========================================================
create table if not exists public.comments (
  id          uuid primary key default uuid_generate_v4(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  parent_id   uuid references public.comments(id) on delete cascade,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  body_json   jsonb not null,
  body_text   text not null,
  is_answer   boolean not null default false,
  is_deleted  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists comments_post_idx    on public.comments (post_id, created_at asc);
create index if not exists comments_parent_idx  on public.comments (parent_id);
create index if not exists comments_author_idx  on public.comments (author_id);

-- FK posts.accepted_answer_id -> comments.id (deferred because circular)
do $$ begin
  alter table public.posts
    add constraint posts_accepted_answer_fk
    foreign key (accepted_answer_id) references public.comments(id) on delete set null
    deferrable initially deferred;
exception when duplicate_object then null; end $$;

-- ==========================================================
-- LIKES (polymorphic: exactly one of post_id/comment_id)
-- ==========================================================
create table if not exists public.likes (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((post_id is not null)::int + (comment_id is not null)::int = 1),
  primary key (user_id, post_id, comment_id)
);
create index if not exists likes_post_idx    on public.likes (post_id);
create index if not exists likes_comment_idx on public.likes (comment_id);

-- ==========================================================
-- BOOKMARKS
-- ==========================================================
create table if not exists public.bookmarks (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  post_id    uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- ==========================================================
-- TICKERS + POST_TICKERS
-- ==========================================================
create table if not exists public.tickers (
  symbol      text primary key,
  market      text not null check (market in ('US','CN')),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.post_tickers (
  post_id  uuid not null references public.posts(id) on delete cascade,
  symbol   text not null references public.tickers(symbol) on delete cascade,
  primary key (post_id, symbol)
);
create index if not exists post_tickers_symbol_idx on public.post_tickers (symbol);

-- ==========================================================
-- CHAT
-- ==========================================================
create table if not exists public.chat_rooms (
  slug        text primary key,
  name        text not null,
  kind        text not null check (kind in ('global','ticker')),
  ref_symbol  text references public.tickers(symbol) on delete cascade,
  created_at  timestamptz not null default now()
);
insert into public.chat_rooms (slug, name, kind) values ('lobby','大厅','global')
on conflict (slug) do nothing;

create table if not exists public.chat_messages (
  id         uuid primary key default uuid_generate_v4(),
  room_slug  text not null references public.chat_rooms(slug) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_room_time_idx on public.chat_messages (room_slug, created_at desc);

-- ==========================================================
-- NOTIFICATIONS
-- ==========================================================
do $$ begin
  create type notification_kind as enum (
    'comment_on_post',
    'reply_to_comment',
    'mention',
    'answer_accepted',
    'like'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
  id            uuid primary key default uuid_generate_v4(),
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  actor_id      uuid references public.profiles(id) on delete set null,
  kind          notification_kind not null,
  post_id       uuid references public.posts(id) on delete cascade,
  comment_id    uuid references public.comments(id) on delete cascade,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (recipient_id) where read_at is null;
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
-- ============================================================
-- 0003 — Functions, triggers, realtime publications
-- Run after 0002.
-- ============================================================

-- ==========================================================
-- updated_at helper
-- ==========================================================
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists posts_updated_at    on public.posts;
drop trigger if exists comments_updated_at on public.comments;
drop trigger if exists profiles_updated_at on public.profiles;
create trigger posts_updated_at    before update on public.posts    for each row execute function public.tg_set_updated_at();
create trigger comments_updated_at before update on public.comments for each row execute function public.tg_set_updated_at();
create trigger profiles_updated_at before update on public.profiles for each row execute function public.tg_set_updated_at();

-- ==========================================================
-- Auto-create profile on signup
-- ==========================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_handle text;
  candidate   text;
  n int := 0;
begin
  base_handle := lower(regexp_replace(coalesce(split_part(new.email,'@',1),'user'), '[^a-z0-9_]', '_', 'g'));
  if length(base_handle) < 3 then
    base_handle := base_handle || '_usr';
  end if;

  candidate := base_handle;
  while exists (select 1 from public.profiles where handle = candidate) loop
    n := n + 1;
    candidate := base_handle || n::text;
  end loop;

  insert into public.profiles (id, handle, display_name)
  values (new.id, candidate, coalesce(split_part(new.email,'@',1), 'New User'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==========================================================
-- Cashtag extraction
-- Matches $AAPL (1-5 letters) or $600519 (6 digits for A-shares).
-- ==========================================================
create or replace function public.extract_cashtags(txt text)
returns text[] language plpgsql immutable as $$
declare
  matches text[];
begin
  select array_agg(distinct upper((m)[1]))
    into matches
  from regexp_matches(coalesce(txt,''), '\$([A-Za-z]{1,5}|[0-9]{6})\M', 'g') as m;
  return coalesce(matches, '{}');
end $$;

create or replace function public.tg_sync_post_tickers()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  syms text[];
  s text;
begin
  syms := public.extract_cashtags(coalesce(new.body_text,'') || ' ' || coalesce(new.title,''));

  delete from public.post_tickers
    where post_id = new.id
      and (array_length(syms,1) is null or symbol <> all(syms));

  if array_length(syms,1) is not null then
    foreach s in array syms loop
      if exists (select 1 from public.tickers where symbol = s) then
        insert into public.post_tickers (post_id, symbol)
          values (new.id, s)
          on conflict do nothing;
      end if;
    end loop;
  end if;
  return new;
end $$;

drop trigger if exists posts_sync_tickers on public.posts;
create trigger posts_sync_tickers
  after insert or update of body_text, title on public.posts
  for each row execute function public.tg_sync_post_tickers();

-- ==========================================================
-- Notify on new comment
-- ==========================================================
create or replace function public.tg_notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  post_author   uuid;
  parent_author uuid;
begin
  select author_id into post_author from public.posts where id = new.post_id;

  if new.parent_id is null then
    if post_author is not null and post_author <> new.author_id then
      insert into public.notifications (recipient_id, actor_id, kind, post_id, comment_id)
      values (post_author, new.author_id, 'comment_on_post', new.post_id, new.id);
    end if;
  else
    select author_id into parent_author from public.comments where id = new.parent_id;
    if parent_author is not null and parent_author <> new.author_id then
      insert into public.notifications (recipient_id, actor_id, kind, post_id, comment_id)
      values (parent_author, new.author_id, 'reply_to_comment', new.post_id, new.id);
    end if;
  end if;
  return new;
end $$;

drop trigger if exists comments_notify on public.comments;
create trigger comments_notify
  after insert on public.comments
  for each row execute function public.tg_notify_on_comment();

-- ==========================================================
-- Mentions (@handle) on posts/comments
-- ==========================================================
create or replace function public.tg_notify_on_mention()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  handles text[];
  h text;
  target uuid;
  pid uuid;
  cid uuid;
begin
  select array_agg(distinct lower((m)[1]))
    into handles
  from regexp_matches(coalesce(new.body_text,''), '@([A-Za-z0-9_]{3,32})', 'g') as m;

  if handles is null then return new; end if;

  if tg_table_name = 'posts' then
    pid := new.id; cid := null;
  else
    pid := new.post_id; cid := new.id;
  end if;

  foreach h in array handles loop
    select id into target from public.profiles where lower(handle::text) = h;
    if target is not null and target <> new.author_id then
      insert into public.notifications (recipient_id, actor_id, kind, post_id, comment_id)
      values (target, new.author_id, 'mention', pid, cid);
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists posts_notify_mentions    on public.posts;
drop trigger if exists comments_notify_mentions on public.comments;
create trigger posts_notify_mentions
  after insert on public.posts    for each row execute function public.tg_notify_on_mention();
create trigger comments_notify_mentions
  after insert on public.comments for each row execute function public.tg_notify_on_mention();

-- ==========================================================
-- Accepted answer notification
-- ==========================================================
create or replace function public.tg_notify_accepted()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  answer_author uuid;
begin
  if new.accepted_answer_id is distinct from old.accepted_answer_id
     and new.accepted_answer_id is not null then
    select author_id into answer_author from public.comments where id = new.accepted_answer_id;
    if answer_author is not null and answer_author <> new.author_id then
      insert into public.notifications (recipient_id, actor_id, kind, post_id, comment_id)
      values (answer_author, new.author_id, 'answer_accepted', new.id, new.accepted_answer_id);
    end if;
    update public.comments set is_answer = true where id = new.accepted_answer_id;
  end if;
  return new;
end $$;

drop trigger if exists posts_notify_accepted on public.posts;
create trigger posts_notify_accepted
  after update of accepted_answer_id on public.posts
  for each row execute function public.tg_notify_accepted();

-- ==========================================================
-- Realtime publication
-- ==========================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.chat_messages';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments'
  ) then
    execute 'alter publication supabase_realtime add table public.comments';
  end if;
end $$;
-- ============================================================
-- 0004 — Seed tickers + per-ticker chat rooms
-- ============================================================

insert into public.tickers (symbol, market, name) values
  -- US
  ('AAPL',  'US', 'Apple Inc.'),
  ('MSFT',  'US', 'Microsoft'),
  ('GOOGL', 'US', 'Alphabet'),
  ('AMZN',  'US', 'Amazon'),
  ('NVDA',  'US', 'NVIDIA'),
  ('META',  'US', 'Meta Platforms'),
  ('TSLA',  'US', 'Tesla'),
  ('AMD',   'US', 'AMD'),
  ('NFLX',  'US', 'Netflix'),
  ('BABA',  'US', 'Alibaba ADR'),
  -- A-shares
  ('600519','CN', '贵州茅台'),
  ('601318','CN', '中国平安'),
  ('000001','CN', '平安银行'),
  ('000858','CN', '五粮液'),
  ('600036','CN', '招商银行'),
  ('000333','CN', '美的集团'),
  ('300750','CN', '宁德时代'),
  ('600276','CN', '恒瑞医药')
on conflict (symbol) do nothing;

-- per-ticker chat rooms
insert into public.chat_rooms (slug, name, kind, ref_symbol)
select 'ticker:' || symbol, symbol, 'ticker', symbol from public.tickers
on conflict (slug) do nothing;

-- ============================================================
-- 0005_storage.sql: buckets + RLS for avatars and post images
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- ========== avatars ==========
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars user insert own folder" on storage.objects;
create policy "avatars user insert own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars user update own folder" on storage.objects;
create policy "avatars user update own folder"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars user delete own folder" on storage.objects;
create policy "avatars user delete own folder"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ========== post-images ==========
drop policy if exists "post-images public read" on storage.objects;
create policy "post-images public read"
  on storage.objects for select
  using (bucket_id = 'post-images');

drop policy if exists "post-images authed insert" on storage.objects;
create policy "post-images authed insert"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and auth.role() = 'authenticated'
  );

drop policy if exists "post-images owner delete" on storage.objects;
create policy "post-images owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'post-images'
    and owner = auth.uid()
  );
