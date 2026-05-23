-- 0018_teaching_categories.sql
-- 教学大厅分类功能

-- 1. 给 teaching_resources 添加 category 字段
ALTER TABLE IF EXISTS public.teaching_resources
  ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. 创建索引加速分类筛选
CREATE INDEX IF NOT EXISTS teaching_resources_category_idx
  ON public.teaching_resources (category)
  WHERE category IS NOT NULL;

-- 3. 更新 RLS 策略：允许管理员更新 category（已有的 author update 策略已覆盖）
-- 不需要额外策略，admin 使用 service role 绕过 RLS
