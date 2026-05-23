-- 客服模块：support_sessions + support_messages + support_faqs

-- ── 1. 客服会话表 ──────────────────────────────────────────────────────
CREATE TABLE public.support_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name   TEXT NOT NULL DEFAULT '匿名用户',
  user_email  TEXT,
  subject     TEXT,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX support_sessions_user_idx   ON public.support_sessions (user_id);
CREATE INDEX support_sessions_status_idx ON public.support_sessions (status);
CREATE INDEX support_sessions_created_idx ON public.support_sessions (created_at DESC);

ALTER TABLE public.support_sessions ENABLE ROW LEVEL SECURITY;

-- 用户只能看自己的会话
CREATE POLICY "support_session: user read own"
  ON public.support_sessions FOR SELECT
  USING (auth.uid() = user_id AND NOT is_deleted);

-- 管理员可以看所有
CREATE POLICY "support_session: admin read all"
  ON public.support_sessions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 任何人可以创建（匿名用户通过 service role 插入）
CREATE POLICY "support_session: public insert"
  ON public.support_sessions FOR INSERT
  WITH CHECK (true);

-- 管理员可以更新
CREATE POLICY "support_session: admin update"
  ON public.support_sessions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 2. 客服消息表 ──────────────────────────────────────────────────────
CREATE TABLE public.support_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.support_sessions(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
  content     TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  admin_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX support_messages_session_idx ON public.support_messages (session_id, created_at DESC);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- 用户只能看自己会话的消息
CREATE POLICY "support_message: user read own"
  ON public.support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid() AND NOT s.is_deleted
    )
    AND NOT is_deleted
  );

-- 管理员可以看所有
CREATE POLICY "support_message: admin read all"
  ON public.support_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 任何人可以发消息（匿名用户通过 service role）
CREATE POLICY "support_message: public insert"
  ON public.support_messages FOR INSERT
  WITH CHECK (true);

-- ── 3. 常见问题自动回复表 ──────────────────────────────────────────────
CREATE TABLE public.support_faqs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keywords    TEXT[] NOT NULL DEFAULT '{}',
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.support_faqs ENABLE ROW LEVEL SECURITY;

-- 所有人可读
CREATE POLICY "support_faq: public read"
  ON public.support_faqs FOR SELECT
  USING (is_active);

-- 管理员可写
CREATE POLICY "support_faq: admin write"
  ON public.support_faqs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 4. 初始化 FAQ 数据 ─────────────────────────────────────────────────
INSERT INTO public.support_faqs (keywords, question, answer, sort_order) VALUES
  (ARRAY['注册', '登录', '账号'], '如何注册和登录？', '点击右上角「登录」按钮，使用邮箱或手机号注册即可。已注册用户直接输入账号密码登录。', 1),
  (ARRAY['发帖', '发布', '怎么发'], '如何发布内容？', '登录后点击首页的「+」按钮或导航栏的「发帖」，填写标题和内容后即可发布。支持文字、图片和投票。', 2),
  (ARRAY['教学', '课程', '学习'], '教学大厅怎么使用？', '点击导航栏「教学」进入教学大厅，可以浏览股票入门、技术分析等分类的视频和文章。', 3),
  (ARRAY['管理员', '后台', 'admin'], '如何进入管理后台？', '管理后台仅限管理员访问。管理员点击用户菜单中的「管理后台」即可进入。', 4),
  (ARRAY['邀请码', '邀请'], '需要邀请码吗？', '普通用户注册不需要邀请码。管理员登录需要邀请码验证。', 5),
  (ARRAY['股票', ' ticker', '行情'], '股票行情在哪里看？', '点击导航栏「行情」可以查看股票列表和实时行情数据。', 6),
  (ARRAY['私信', '消息', '聊天'], '如何私信其他用户？', '进入对方个人主页，点击「发私信」按钮即可开始对话。', 7),
  (ARRAY['举报', '投诉', '违规'], '如何举报违规内容？', '点击帖子或评论右上角的「⋯」菜单，选择「举报」并填写原因即可。', 8),
  (ARRAY['密码', '忘记密码'], '忘记密码怎么办？', '在登录页面点击「忘记密码」，按照提示通过邮箱重置密码。', 9),
  (ARRAY['客服', '人工', '帮助'], '如何联系人工客服？', '您可以继续在此输入问题，管理员会尽快回复。如遇紧急情况，请留下联系方式。', 10);
