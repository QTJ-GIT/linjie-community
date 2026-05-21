-- ============================================================
-- 0014 — posts.last_activity_at + last_replier_id（活线程冗余 + 触发器）
--
-- 给 posts 增加两列冗余字段，把"内容流"升级成"活线程列表"：
--   - last_activity_at timestamptz：最近一次有效活动（评论）的时间
--   - last_replier_id  uuid       ：最近一位回复者
--
-- 由 comments AFTER INSERT 触发器同步；附加一次性 backfill 兜底历史数据。
--
-- 注意：本迁移**不**处理 comments UPDATE（软删恢复 / 编辑等）以保持简洁。
--       如未来需要"软删后回退活动时间"，再做一次 AFTER UPDATE 触发即可。
--
-- 命名约定：
--   - FK 显式命名 posts_last_replier_id_fkey，方便 PostgREST 在
--     `last_replier:profiles!posts_last_replier_id_fkey(...)` 中消歧
--     （posts 已有 author_id → profiles(id) 一条 FK，关系图歧义必须靠 FK 名解决）
--
-- 安全可重跑：所有 DDL 用 if [not] exists / drop ... if exists ; create ...
-- ============================================================

-- ------------------------------------------------------------
-- 1) 列与外键
-- ------------------------------------------------------------
alter table public.posts
  add column if not exists last_activity_at timestamptz;

alter table public.posts
  add column if not exists last_replier_id uuid;

-- 显式命名 FK；如已存在则跳过（重跑安全）
do $$ begin
  alter table public.posts
    add constraint posts_last_replier_id_fkey
    foreign key (last_replier_id)
    references public.profiles(id)
    on delete set null;
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- 2) 索引：按 last_activity_at 倒排（NULLS LAST）
-- ------------------------------------------------------------
create index if not exists posts_last_activity_idx
  on public.posts (last_activity_at desc nulls last);

-- ------------------------------------------------------------
-- 3) 一次性 backfill（幂等：仅填 last_activity_at is null 的行）
-- ------------------------------------------------------------
with latest as (
  select distinct on (post_id) post_id, created_at, author_id
    from public.comments
   where is_deleted = false
   order by post_id, created_at desc
)
update public.posts p
   set last_activity_at = coalesce(l.created_at, p.created_at),
       last_replier_id  = l.author_id
  from latest l
 where p.id = l.post_id
   and p.last_activity_at is null;

-- 没评论的帖子兜底
update public.posts p
   set last_activity_at = p.created_at,
       last_replier_id  = null
 where p.last_activity_at is null;

-- ------------------------------------------------------------
-- 4) 触发器：comments AFTER INSERT 时同步活线程冗余
-- ------------------------------------------------------------
drop function if exists public.tg_post_bump_last_activity() cascade;

create or replace function public.tg_post_bump_last_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_deleted = false then
    update public.posts
       set last_activity_at = new.created_at,
           last_replier_id  = new.author_id
     where id = new.post_id;
  end if;
  return null;
end
$$;

drop trigger if exists comments_bump_post_activity on public.comments;
create trigger comments_bump_post_activity
  after insert on public.comments
  for each row execute function public.tg_post_bump_last_activity();
