-- ============================================================
-- 0013 — Drop push_subscriptions (Web Push 功能下架)
-- 临介社区定位为网页（非 PWA / 桌面 app），不再需要 Web Push。
-- 安全可重跑。
-- ============================================================

drop policy if exists "push_subs self select" on public.push_subscriptions;
drop policy if exists "push_subs self insert" on public.push_subscriptions;
drop policy if exists "push_subs self delete" on public.push_subscriptions;

drop index if exists public.push_subs_user_idx;
drop table if exists public.push_subscriptions;
