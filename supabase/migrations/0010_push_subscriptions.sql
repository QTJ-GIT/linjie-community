-- ============================================================
-- 0010 — Group L: web push subscriptions
-- ============================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
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
