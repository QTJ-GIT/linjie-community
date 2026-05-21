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
