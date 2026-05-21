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
