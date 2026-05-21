-- ============================================================
-- 0015 — sections hierarchy & sort order
--
-- 目的：让 public.sections 支持二级层级（通过 parent_slug 自引用）
--       与自定义排序（sort_order），为后续二级版块（美股 / A股 /
--       虚拟币 等）做数据模型铺垫。
--
-- 注意：本迁移只加 schema，不插入任何子版块。已有的
--       general / qa / stocks 三个顶级 section 保持不动
--       （parent_slug 默认 null = 顶级）。
--
-- Idempotent：可重复执行（add column if not exists / drop policy if exists 等）。
-- ============================================================

-- 1) 新增列 ----------------------------------------------------
alter table public.sections
  add column if not exists parent_slug text;

alter table public.sections
  add column if not exists sort_order smallint not null default 100;

-- 2) 自引用外键 -----------------------------------------------
-- 单独一段 do $$ 包裹，方便重复执行（duplicate_object 时跳过）
do $$ begin
  alter table public.sections
    add constraint sections_parent_slug_fkey
    foreign key (parent_slug) references public.sections(slug) on delete set null;
exception when duplicate_object then null; end $$;

-- 3) 索引 ------------------------------------------------------
create index if not exists sections_parent_sort_idx
  on public.sections (parent_slug nulls first, sort_order);

-- 4) 给已有顶级 section 一个稳定的展示顺序 --------------------
update public.sections set sort_order = 10  where slug = 'general';
update public.sections set sort_order = 20  where slug = 'qa';
update public.sections set sort_order = 30  where slug = 'stocks';
