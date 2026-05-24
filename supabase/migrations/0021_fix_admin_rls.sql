-- ============================================================
-- 0021 — Fix RLS policies: allow admins to bypass owner-only WITH CHECK
-- ============================================================

-- posts: admin update was blocked by "posts update own" WITH CHECK
-- because PostgreSQL RLS requires ALL WITH CHECK policies to pass.
drop policy if exists "posts update own" on public.posts;
create policy "posts update own" on public.posts
  for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id or public.is_admin());

-- comments: same issue for admin comment deletion
drop policy if exists "comments update own" on public.comments;
create policy "comments update own" on public.comments
  for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id or public.is_admin());
