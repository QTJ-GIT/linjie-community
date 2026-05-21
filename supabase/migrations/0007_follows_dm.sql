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
