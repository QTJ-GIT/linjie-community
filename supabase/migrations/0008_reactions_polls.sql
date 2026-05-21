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
