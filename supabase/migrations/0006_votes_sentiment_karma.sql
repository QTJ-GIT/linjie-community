-- ============================================================
-- 0006 — Group A: votes (up/down) + sentiment + karma
-- Safe to re-run.
-- ============================================================

-- 1) Extend likes table to be a vote (value: +1 upvote, -1 downvote)
alter table public.likes
  add column if not exists value smallint not null default 1;

-- add check (drop first if exists with different def)
do $$ begin
  alter table public.likes
    add constraint likes_value_check check (value in (-1, 1));
exception when duplicate_object then null; end $$;

-- 2) Denormalized score column on posts and comments (maintained by trigger)
alter table public.posts
  add column if not exists score integer not null default 0;

alter table public.comments
  add column if not exists score integer not null default 0;

-- index to sort by score cheaply
create index if not exists posts_score_idx on public.posts (score desc, created_at desc);
create index if not exists comments_score_idx on public.comments (score desc);

-- 3) Trigger to keep score in sync with votes (likes rows)
create or replace function public.tg_update_score()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  delta int := 0;
  pid   uuid;
  cid   uuid;
begin
  if tg_op = 'INSERT' then
    delta := new.value;
    pid   := new.post_id;
    cid   := new.comment_id;
  elsif tg_op = 'DELETE' then
    delta := -old.value;
    pid   := old.post_id;
    cid   := old.comment_id;
  elsif tg_op = 'UPDATE' then
    delta := new.value - old.value;
    pid   := new.post_id;
    cid   := new.comment_id;
  end if;

  if pid is not null then
    update public.posts set score = score + delta where id = pid;
  end if;
  if cid is not null then
    update public.comments set score = score + delta where id = cid;
  end if;
  return null;
end $$;

drop trigger if exists likes_score_tg on public.likes;
create trigger likes_score_tg
  after insert or delete or update on public.likes
  for each row execute function public.tg_update_score();

-- Allow vote flipping via UPDATE (RLS currently doesn't; add policy)
drop policy if exists "likes update self" on public.likes;
create policy "likes update self" on public.likes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4) One-time backfill: recompute score from current likes (in case there are any)
update public.posts p
set score = coalesce((select sum(value) from public.likes where post_id = p.id), 0);

update public.comments c
set score = coalesce((select sum(value) from public.likes where comment_id = c.id), 0);

-- 5) Sentiment tag for posts
do $$ begin
  create type post_sentiment as enum ('bull', 'bear', 'neutral', 'question', 'rant');
exception when duplicate_object then null; end $$;

alter table public.posts
  add column if not exists sentiment post_sentiment;

create index if not exists posts_sentiment_idx on public.posts (sentiment)
  where sentiment is not null;

-- 6) User karma view: sum of scores on all non-deleted posts and comments authored by user
create or replace view public.user_karma as
with post_scores as (
  select author_id, coalesce(sum(score), 0)::int as s
  from public.posts where is_deleted = false group by author_id
),
comment_scores as (
  select author_id, coalesce(sum(score), 0)::int as s
  from public.comments where is_deleted = false group by author_id
)
select
  p.id as user_id,
  coalesce((select s from post_scores ps where ps.author_id = p.id), 0) +
  coalesce((select s from comment_scores cs where cs.author_id = p.id), 0) as karma
from public.profiles p;

-- grant + let it pass through RLS (views inherit from underlying tables)
grant select on public.user_karma to anon, authenticated;
