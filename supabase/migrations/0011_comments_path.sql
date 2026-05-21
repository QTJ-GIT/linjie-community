-- ============================================================
-- 0011 — comments.path / child_count / depth (中期 roadmap 项)
-- 为楼中楼聚焦页 + path LIKE 懒加载 + 客户端折叠 UI 铺路。
-- 安全可重跑（add column if not exists、recursive CTE backfill 幂等）。
-- 依赖：0001 已创建 public.comments。运行顺序在 0010 之后。
-- ============================================================

-- 1) 列：path 是 dot-separated 祖先链（含自己），depth 是从根到当前的层数，
--    child_count 是直接子评论数。
alter table public.comments
  add column if not exists path        text,
  add column if not exists depth       smallint not null default 0,
  add column if not exists child_count integer  not null default 0;

-- 2) 索引：path 用 btree text_pattern_ops 支持 `LIKE 'X.%'` 前缀匹配
create index if not exists comments_path_idx
  on public.comments using btree (path text_pattern_ops);

-- 3) 触发器：INSERT 前根据 parent.path 拼接当前 path/depth
create or replace function public.tg_comments_set_path()
returns trigger language plpgsql as $$
declare
  parent_path  text;
  parent_depth smallint;
begin
  if new.parent_id is null then
    new.path  := new.id::text;
    new.depth := 0;
  else
    select c.path, c.depth into parent_path, parent_depth
      from public.comments c where c.id = new.parent_id;
    if parent_path is null then
      -- 父节点尚未 backfill；回退为仅当前 id（极少发生）
      new.path  := new.id::text;
      new.depth := 0;
    else
      new.path  := parent_path || '.' || new.id::text;
      new.depth := parent_depth + 1;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists comments_set_path on public.comments;
create trigger comments_set_path
  before insert on public.comments
  for each row execute function public.tg_comments_set_path();

-- 4) 触发器：维护父节点 child_count
create or replace function public.tg_comments_update_child_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.parent_id is not null then
      update public.comments
         set child_count = child_count + 1
       where id = new.parent_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.parent_id is not null then
      update public.comments
         set child_count = greatest(child_count - 1, 0)
       where id = old.parent_id;
    end if;
  end if;
  return null;
end $$;

drop trigger if exists comments_update_child_count on public.comments;
create trigger comments_update_child_count
  after insert or delete on public.comments
  for each row execute function public.tg_comments_update_child_count();

-- 5) 一次性 backfill：用 recursive CTE 重建 path/depth；child_count 从直接子评论计数
do $$
begin
  -- 仅当还有 path 为 null 的行时执行（幂等）
  if exists (select 1 from public.comments where path is null limit 1) then
    with recursive tree as (
      select id, parent_id,
             id::text as path,
             0::smallint as depth
        from public.comments
       where parent_id is null
      union all
      select c.id, c.parent_id,
             t.path || '.' || c.id::text,
             (t.depth + 1)::smallint
        from public.comments c
        join tree t on c.parent_id = t.id
    )
    update public.comments c
       set path  = t.path,
           depth = t.depth
      from tree t
     where c.id = t.id;
  end if;

  -- 重新计算所有 child_count（直接子评论数）
  update public.comments c
     set child_count = sub.cnt
    from (
      select parent_id, count(*)::int as cnt
        from public.comments
       where parent_id is not null
       group by parent_id
    ) sub
   where c.id = sub.parent_id;

  -- 没有子评论的节点 child_count 归零（避免历史脏数据）
  update public.comments c
     set child_count = 0
   where c.child_count > 0
     and not exists (select 1 from public.comments x where x.parent_id = c.id);
end $$;

-- 6) 使用示例（前端按需懒加载某节点的整棵子树）：
--    select * from public.comments
--      where post_id = $1 and path like ($2 || '.%')
--      order by path;
