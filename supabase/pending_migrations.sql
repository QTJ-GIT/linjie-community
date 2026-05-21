-- ============================================================
-- 0007 — Group B: follows (users + tickers) + direct messages
-- ============================================================

-- ============ FOLLOW USERS ============
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);
create index if not exists follows_follower_idx  on public.follows (follower_id);

alter table public.follows enable row level security;

drop policy if exists "follows readable"    on public.follows;
drop policy if exists "follows insert self" on public.follows;
drop policy if exists "follows delete self" on public.follows;
create policy "follows readable"    on public.follows for select using (true);
create policy "follows insert self" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows delete self" on public.follows for delete using (auth.uid() = follower_id);

-- ============ FOLLOW TICKERS ============
create table if not exists public.ticker_follows (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  symbol     text not null references public.tickers(symbol) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, symbol)
);
create index if not exists ticker_follows_symbol_idx on public.ticker_follows (symbol);

alter table public.ticker_follows enable row level security;

drop policy if exists "ticker_follows readable"    on public.ticker_follows;
drop policy if exists "ticker_follows insert self" on public.ticker_follows;
drop policy if exists "ticker_follows delete self" on public.ticker_follows;
create policy "ticker_follows readable"    on public.ticker_follows for select using (true);
create policy "ticker_follows insert self" on public.ticker_follows for insert with check (auth.uid() = user_id);
create policy "ticker_follows delete self" on public.ticker_follows for delete using (auth.uid() = user_id);

-- ============ DM THREADS ============
-- Normalized: always user_a_id < user_b_id to ensure uniqueness
create table if not exists public.dm_threads (
  id              uuid primary key default uuid_generate_v4(),
  user_a_id       uuid not null references public.profiles(id) on delete cascade,
  user_b_id       uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  check (user_a_id < user_b_id),
  unique (user_a_id, user_b_id)
);
create index if not exists dm_threads_a_idx on public.dm_threads (user_a_id, last_message_at desc);
create index if not exists dm_threads_b_idx on public.dm_threads (user_b_id, last_message_at desc);

alter table public.dm_threads enable row level security;

drop policy if exists "dm_threads participant select" on public.dm_threads;
drop policy if exists "dm_threads participant insert" on public.dm_threads;
create policy "dm_threads participant select" on public.dm_threads
  for select using (auth.uid() in (user_a_id, user_b_id));
create policy "dm_threads participant insert" on public.dm_threads
  for insert with check (auth.uid() in (user_a_id, user_b_id));

-- ============ DM MESSAGES ============
create table if not exists public.dm_messages (
  id         uuid primary key default uuid_generate_v4(),
  thread_id  uuid not null references public.dm_threads(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 4000),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists dm_messages_thread_time_idx on public.dm_messages (thread_id, created_at desc);

alter table public.dm_messages enable row level security;

-- Participant helper: bind thread participants for RLS subquery
drop policy if exists "dm_messages participant select" on public.dm_messages;
drop policy if exists "dm_messages participant insert" on public.dm_messages;
drop policy if exists "dm_messages mark read"          on public.dm_messages;
create policy "dm_messages participant select" on public.dm_messages
  for select using (
    exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id
        and auth.uid() in (t.user_a_id, t.user_b_id)
    )
  );
create policy "dm_messages participant insert" on public.dm_messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id
        and auth.uid() in (t.user_a_id, t.user_b_id)
    )
  );
-- Recipient can mark messages as read
create policy "dm_messages mark read" on public.dm_messages
  for update using (
    exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id
        and auth.uid() in (t.user_a_id, t.user_b_id)
        and auth.uid() <> dm_messages.sender_id
    )
  ) with check (
    exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id
        and auth.uid() in (t.user_a_id, t.user_b_id)
    )
  );

-- Trigger to bump thread.last_message_at on new message
create or replace function public.tg_dm_bump_thread()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.dm_threads set last_message_at = new.created_at where id = new.thread_id;
  return null;
end $$;

drop trigger if exists dm_messages_bump on public.dm_messages;
create trigger dm_messages_bump
  after insert on public.dm_messages
  for each row execute function public.tg_dm_bump_thread();

-- Realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dm_messages'
  ) then execute 'alter publication supabase_realtime add table public.dm_messages'; end if;
end $$;

-- Helper RPC: get or create a DM thread between current user and another user
create or replace function public.dm_get_or_create_thread(other_user uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  a uuid; b uuid; tid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if auth.uid() = other_user then raise exception 'cannot dm self'; end if;
  if auth.uid() < other_user then
    a := auth.uid(); b := other_user;
  else
    a := other_user; b := auth.uid();
  end if;

  select id into tid from public.dm_threads where user_a_id = a and user_b_id = b;
  if tid is null then
    insert into public.dm_threads (user_a_id, user_b_id) values (a, b) returning id into tid;
  end if;
  return tid;
end $$;

grant execute on function public.dm_get_or_create_thread(uuid) to authenticated;
-- ============================================================
-- 0008 — Group C: reactions + polls
-- ============================================================

-- ============ REACTIONS (on post, comment, or chat message) ============
create table if not exists public.reactions (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment','chat_message')),
  target_id   uuid not null,
  emoji       text not null check (char_length(emoji) between 1 and 16),
  created_at  timestamptz not null default now(),
  primary key (user_id, target_type, target_id, emoji)
);
create index if not exists reactions_target_idx on public.reactions (target_type, target_id);

alter table public.reactions enable row level security;

drop policy if exists "reactions readable"    on public.reactions;
drop policy if exists "reactions insert self" on public.reactions;
drop policy if exists "reactions delete self" on public.reactions;
create policy "reactions readable"    on public.reactions for select using (true);
create policy "reactions insert self" on public.reactions for insert with check (auth.uid() = user_id);
create policy "reactions delete self" on public.reactions for delete using (auth.uid() = user_id);

-- ============ POLLS ============
create table if not exists public.polls (
  post_id     uuid primary key references public.posts(id) on delete cascade,
  multiple    boolean not null default false,
  closes_at   timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.poll_options (
  id       uuid primary key default uuid_generate_v4(),
  poll_id  uuid not null references public.polls(post_id) on delete cascade,
  idx      smallint not null,
  text     text not null check (char_length(text) between 1 and 200),
  unique (poll_id, idx)
);
create index if not exists poll_options_poll_idx on public.poll_options (poll_id, idx);

create table if not exists public.poll_votes (
  poll_id    uuid not null references public.polls(post_id) on delete cascade,
  option_id  uuid not null references public.poll_options(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (poll_id, option_id, user_id)
);
create index if not exists poll_votes_user_idx on public.poll_votes (user_id);

alter table public.polls         enable row level security;
alter table public.poll_options  enable row level security;
alter table public.poll_votes    enable row level security;

-- Polls readable by anyone; insert/update/delete by post author only
drop policy if exists "polls readable" on public.polls;
drop policy if exists "polls author write" on public.polls;
create policy "polls readable" on public.polls for select using (true);
create policy "polls author write" on public.polls
  for all using (
    exists (select 1 from public.posts p where p.id = polls.post_id and p.author_id = auth.uid())
  ) with check (
    exists (select 1 from public.posts p where p.id = polls.post_id and p.author_id = auth.uid())
  );

drop policy if exists "poll_options readable" on public.poll_options;
drop policy if exists "poll_options author write" on public.poll_options;
create policy "poll_options readable" on public.poll_options for select using (true);
create policy "poll_options author write" on public.poll_options
  for all using (
    exists (
      select 1 from public.polls pl join public.posts po on po.id = pl.post_id
      where pl.post_id = poll_options.poll_id and po.author_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.polls pl join public.posts po on po.id = pl.post_id
      where pl.post_id = poll_options.poll_id and po.author_id = auth.uid()
    )
  );

drop policy if exists "poll_votes readable" on public.poll_votes;
drop policy if exists "poll_votes self insert" on public.poll_votes;
drop policy if exists "poll_votes self delete" on public.poll_votes;
create policy "poll_votes readable"    on public.poll_votes for select using (true);
create policy "poll_votes self insert" on public.poll_votes for insert with check (auth.uid() = user_id);
create policy "poll_votes self delete" on public.poll_votes for delete using (auth.uid() = user_id);

-- Enforce single-choice at DB level for !multiple polls:
-- if multiple=false, user may have at most 1 vote row on that poll.
create or replace function public.tg_poll_single_choice()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_multiple boolean;
begin
  select multiple into is_multiple from public.polls where post_id = new.poll_id;
  if not is_multiple then
    if exists (
      select 1 from public.poll_votes
      where poll_id = new.poll_id and user_id = new.user_id and option_id <> new.option_id
    ) then
      raise exception '该投票为单选，请先撤销已选项';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists poll_votes_single_choice on public.poll_votes;
create trigger poll_votes_single_choice
  before insert on public.poll_votes
  for each row execute function public.tg_poll_single_choice();

-- Realtime for reactions (so post/chat reactions update live)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reactions'
  ) then execute 'alter publication supabase_realtime add table public.reactions'; end if;
end $$;
-- ============================================================
-- 0009 — Group K: admin + moderation (reports, pinning, admin flag)
-- ============================================================

-- 1) is_admin flag on profiles
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2) is_pinned flag on posts (admin-controlled)
alter table public.posts
  add column if not exists is_pinned boolean not null default false;

create index if not exists posts_pinned_idx on public.posts (is_pinned) where is_pinned = true;

-- 3) Admin check helper (SECURITY DEFINER so it can read profiles even under RLS)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- 4) Reports table
do $$ begin
  create type report_status as enum ('pending', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

create table if not exists public.reports (
  id            uuid primary key default uuid_generate_v4(),
  reporter_id   uuid references public.profiles(id) on delete set null,
  target_type   text not null check (target_type in ('post', 'comment', 'chat_message', 'user')),
  target_id     uuid not null,
  reason        text not null check (char_length(reason) between 1 and 500),
  status        report_status not null default 'pending',
  reviewed_by   uuid references public.profiles(id) on delete set null,
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists reports_status_idx  on public.reports (status, created_at desc);
create index if not exists reports_target_idx  on public.reports (target_type, target_id);

alter table public.reports enable row level security;

-- Users can insert reports (about others, not themselves in the 'user' case)
drop policy if exists "reports insert self" on public.reports;
create policy "reports insert self" on public.reports
  for insert with check (
    auth.uid() = reporter_id
    and not (target_type = 'user' and target_id = auth.uid())
  );

-- Only admins can read / update reports
drop policy if exists "reports admin select" on public.reports;
create policy "reports admin select" on public.reports
  for select using (public.is_admin());

drop policy if exists "reports admin update" on public.reports;
create policy "reports admin update" on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- Admins can also bypass normal RLS on posts/comments for soft-delete and pin
-- (Admins already can't edit as author; we need separate admin-only update policies.)
drop policy if exists "posts admin update" on public.posts;
create policy "posts admin update" on public.posts
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "comments admin update" on public.comments;
create policy "comments admin update" on public.comments
  for update using (public.is_admin()) with check (public.is_admin());

-- Convenience view: pending report count
create or replace view public.report_pending_count as
select count(*)::int as pending from public.reports where status = 'pending';
grant select on public.report_pending_count to authenticated;
-- ============================================================
-- 0010 — Group L: web push subscriptions
-- ============================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  unique (user_id, endpoint)
);
create index if not exists push_subs_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subs self select" on public.push_subscriptions;
drop policy if exists "push_subs self insert" on public.push_subscriptions;
drop policy if exists "push_subs self delete" on public.push_subscriptions;
create policy "push_subs self select" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push_subs self insert" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push_subs self delete" on public.push_subscriptions
  for delete using (auth.uid() = user_id);
