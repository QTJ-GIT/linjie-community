-- 0016_teaching_resources.sql
-- 教学大厅：teaching_resources 表 + teaching-videos Storage bucket

-- ── 1. 表 ──────────────────────────────────────────────────────────────
CREATE TABLE public.teaching_resources (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            TEXT        NOT NULL CHECK (type IN ('video', 'article')),
  title           TEXT        NOT NULL CHECK (char_length(title) BETWEEN 2 AND 200),
  description     TEXT        CHECK (char_length(description) <= 500),
  -- 视频专属
  video_url       TEXT,        -- Supabase Storage 直传公开 URL
  embed_url       TEXT,        -- 外部嵌入链接（B站/YouTube/腾讯）
  thumbnail_url   TEXT,        -- 视频封面图
  -- 文章专属
  body_json       JSONB,       -- TipTap JSON
  body_text       TEXT,        -- 提取的纯文本（搜索/摘要用）
  -- 通用
  cover_image_url TEXT,
  view_count      INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted      BOOLEAN     NOT NULL DEFAULT FALSE
);

CREATE INDEX teaching_resources_author_idx  ON public.teaching_resources (author_id);
CREATE INDEX teaching_resources_type_idx    ON public.teaching_resources (type);
CREATE INDEX teaching_resources_created_idx ON public.teaching_resources (created_at DESC);

-- ── 2. RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.teaching_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teaching: public read"
  ON public.teaching_resources FOR SELECT
  USING (NOT is_deleted);

CREATE POLICY "teaching: author insert"
  ON public.teaching_resources FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "teaching: author update"
  ON public.teaching_resources FOR UPDATE
  USING (auth.uid() = author_id);

-- ── 3. 浏览量递增 RPC（SECURITY DEFINER，无需登录也可调用）────────────
CREATE OR REPLACE FUNCTION public.increment_teaching_view_count(resource_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.teaching_resources
  SET view_count = view_count + 1
  WHERE id = resource_id AND NOT is_deleted;
$$;

-- ── 4. Storage bucket: teaching-videos ─────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('teaching-videos', 'teaching-videos', true)
ON CONFLICT (id) DO NOTHING;

-- 认证用户可上传
CREATE POLICY "teaching-videos: auth upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'teaching-videos');

-- 所有人可读
CREATE POLICY "teaching-videos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'teaching-videos');

-- 上传者可删除自己文件（路径首段为 userId）
CREATE POLICY "teaching-videos: owner delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'teaching-videos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
