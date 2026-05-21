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
