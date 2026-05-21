-- ============================================================
-- 0012 — profiles.last_seen + touch_last_seen() RPC
-- 用于 presence 协议之外的"X 分钟前在线"持久化。
-- 配合 [[useLastVisited]] 不一样：useLastVisited 是 client localStorage，
-- last_seen 是 server-side 真实在线时间，可被任何 viewer 读到。
-- 安全可重跑。
-- ============================================================

alter table public.profiles
  add column if not exists last_seen timestamptz;

create index if not exists profiles_last_seen_idx
  on public.profiles (last_seen desc nulls last);

-- 客户端调用 supabase.rpc('touch_last_seen') 标记自己在线。
-- 推荐节流：聊天/feed 心跳每 60s 调一次即可，避免每个事件都打。
create or replace function public.touch_last_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
     set last_seen = now()
   where id = auth.uid();
$$;

grant execute on function public.touch_last_seen() to authenticated;

-- 视图：在线/最近活跃用户（5 分钟内）
create or replace view public.recently_active_users as
select id, handle, display_name, avatar_url, last_seen
  from public.profiles
 where last_seen is not null
   and last_seen > now() - interval '5 minutes'
 order by last_seen desc;

grant select on public.recently_active_users to anon, authenticated;
