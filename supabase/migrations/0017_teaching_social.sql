-- 0017_teaching_social.sql
-- 教学大厅社交功能：点赞 / 收藏 / 评论

-- ── 1. 点赞 ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teaching_likes (
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.teaching_resources(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, resource_id)
);
CREATE INDEX IF NOT EXISTS teaching_likes_resource_idx ON public.teaching_likes (resource_id);
ALTER TABLE IF EXISTS public.teaching_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teaching_likes: read"   ON public.teaching_likes;
DROP POLICY IF EXISTS "teaching_likes: insert" ON public.teaching_likes;
DROP POLICY IF EXISTS "teaching_likes: delete" ON public.teaching_likes;
CREATE POLICY "teaching_likes: read"   ON public.teaching_likes FOR SELECT USING (true);
CREATE POLICY "teaching_likes: insert" ON public.teaching_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "teaching_likes: delete" ON public.teaching_likes FOR DELETE USING (auth.uid() = user_id);

-- ── 2. 收藏 ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teaching_bookmarks (
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.teaching_resources(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, resource_id)
);
CREATE INDEX IF NOT EXISTS teaching_bookmarks_user_idx ON public.teaching_bookmarks (user_id);
ALTER TABLE IF EXISTS public.teaching_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teaching_bookmarks: self" ON public.teaching_bookmarks;
CREATE POLICY "teaching_bookmarks: self" ON public.teaching_bookmarks FOR ALL USING (auth.uid() = user_id);

-- ── 3. 评论 ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teaching_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.teaching_resources(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body_text   TEXT NOT NULL CHECK (char_length(body_text) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS teaching_comments_resource_idx ON public.teaching_comments (resource_id, created_at DESC);
ALTER TABLE IF EXISTS public.teaching_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teaching_comments: public read"   ON public.teaching_comments;
DROP POLICY IF EXISTS "teaching_comments: author insert" ON public.teaching_comments;
DROP POLICY IF EXISTS "teaching_comments: author update" ON public.teaching_comments;
CREATE POLICY "teaching_comments: public read"   ON public.teaching_comments FOR SELECT USING (NOT is_deleted);
CREATE POLICY "teaching_comments: author insert" ON public.teaching_comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "teaching_comments: author update" ON public.teaching_comments FOR UPDATE USING (auth.uid() = author_id);
