-- 0020_post_comment_deleted_audit.sql
-- 复制以下 SQL 到 Supabase Dashboard → SQL Editor → New query → 点击 Run

-- 1) posts: who deleted and when
alter table public.posts
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null,
  add column if not exists deleted_at timestamptz;

-- 2) comments: who deleted and when
alter table public.comments
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null,
  add column if not exists deleted_at timestamptz;

-- 3) Indexes for admin audit queries
create index if not exists posts_deleted_by_idx on public.posts (deleted_by) where deleted_by is not null;
create index if not exists posts_deleted_at_idx on public.posts (deleted_at) where deleted_at is not null;
create index if not exists comments_deleted_by_idx on public.comments (deleted_by) where deleted_by is not null;
create index if not exists comments_deleted_at_idx on public.comments (deleted_at) where deleted_at is not null;
