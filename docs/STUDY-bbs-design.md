# STUDY · 中文 BBS / 论坛品类的设计课

> **信源限制**：本环境 WebFetch 被拒，**未对 klpbbs.com 做 live 验证**。下文关于 Discuz / 苦力怕论坛的"观察"，基于训练记忆里**中文 Discuz 论坛通用模式**（首页版块表 + 主题列表 + 楼层页 + 用户名片）。当作品类常识看，不当作单站事实。
> **目的**：研究 BBS 这一品类背后的**道理**，不抄它的 90 年代风格。
> **边界**：动效见 `docs/MOTION-RECIPES.md`；通用排版/颜色/间距见 `docs/WEB-DESIGN-PRINCIPLES.md`；功能 backlog 见 `docs/UPGRADE-ROADMAP.md`。本份不重复，只讲"社区类站点"独有的东西。

---

## 课 1 · 信息密度 vs 留白

**观察到 / 常见做法**：Discuz 首页一屏可塞 30+ 主题，行高 28–34px，左侧"主题图标 + 标题 + 精华/置顶角标"占大半，右侧紧排"作者|发表时间|回复数/查看数|最后回复人|最后回复时间"。版块列表同理：表格 + 斑马纹，无圆角无阴影。

**背后的道理**：BBS 用户不是"逛"，是"扫"——一次会话目标是"判断哪些线程值得点开"。**判断的依据是元数据，不是内容**。每多一行留白就少一个候选；扫描成本 ∝ 1/密度。这是消费导向而非展示导向的界面。

**对临介社区的启示**：详情页阅读流、着陆 hero、单条 PostCard 的 `card` 模式守住低密度（这是 Substack/shadcn 的对的地方）；但**列表/版块/消息/通知**这些"扫描场景"应该比现在更密。当前 `compact` 模式已经在做了，但远没到 BBS 密度。

**具体落地点**：
- `src/components/posts/PostCard.tsx` L201–239 `compact`：仍渲染 footer，可再压一档变"超紧凑"——单行 36px，voteCol/title/meta 一行排开，body_text 不渲染只 hover tooltip。
- `src/components/notifications/NotificationList.tsx`：通知是典型 BBS 扫描场景，按 card 排会浪费屏幕。
- `src/app/(app)/messages/`：DM 列表同。

---

## 课 2 · 元数据可见性

**观察到 / 常见做法**：BBS 帖子行同时显示 6–8 项元数据：作者、时间、回复数 / 查看数、**最后回复人 + 最后回复时间**、版主 / 精华 / 锁定 / 投票 / 附件 图标。每一项都很小（10–11px），但都在。

**背后的道理**：社区是生态系统，**生态健康靠"可见性"维持**。"谁在活跃 / 我的帖子有没有人回 / 这个线程死了没"——这些信号必须在列表层就能看到。Ostrom 公地治理意义上的"可监控"。

**对临介社区的启示**：当前 PostCard 显示 author / time / section / score / comment_count，**缺三件最重要的**：①最后活动时间（最近评论时间）②最后回复人头像 ③查看数。前两件让"活线程"和"死线程"立判，第三件让"高曝光低回复"的争议帖凸显。

**具体落地点**：
- `src/types/domain.ts` L34–42 `PostWithAuthor`：加 `last_activity_at`、`last_replier: Pick<Profile, ...> | null`、`view_count`。
- `src/components/posts/PostCard.tsx` Footer L166–186：在 ReportButton 左侧加 `<LastActivity>`——4px 小头像 + "X 分钟前由 @handle"。
- 数据走视图或 posts 冗余列 + 触发器，**不要在 FeedList 里 N+1**。
- view_count 暂缓——先要埋点机制。

---

## 课 3 · 版块层级 / 分类导航

**观察到 / 常见做法**：Discuz 是严格的**版块树**：分区 → 版块 → 子版块 → 主题。顶 tab 是分区，左 sidebar 是当前分区下的版块树。每个版块有自己的版主、规则、置顶。

**背后的道理**：层级解决"**话题归属**"和"**治理边界**"。版主权限是按版块授予的、规则是按版块写的。tag 解决"横切"（一个帖子既是 #价值投资也是 #港股），但**替代不了层级**——治理需要边界。

**对临介社区的启示**：当前 `general/qa/stocks` 平铺写死（Sidebar L38–45、SectionSlug 联合类型、sections seed）。未来加"美股/A股/虚拟币"，**应走层级而非 tag**——因为这些细分会自然产生"区版主、本版规则、本版置顶"的需求。tag/ticker 留给横切关注（一只股票穿越多版块）。

**具体落地点**：
- `supabase/migrations/0001_init_schema.sql` L27–36 `sections`：加 `parent_slug text references sections(slug)` + `sort_order int`。**数据模型先行，UI 后改**。
- `src/types/domain.ts` L11 `SectionSlug`：从联合类型改 `string`，让数据库决定版块集合。
- `src/components/shell/Sidebar.tsx` L38–45 `BROWSE`：改 server fetch sections 树并按 parent_slug 嵌套渲染（缩进式而非弹出菜单——hover 弹出在 BBS 里是反模式）。
- ticker 系统保留作横切，不动。

---

## 课 4 · 用户身份的"重量"

**观察到 / 常见做法**：BBS 在每个楼层左侧固定 `UserCard`（80–120px 宽）——头像、用户组、等级条、积分、注册时间、发帖数、勋章墙、签名档。每楼都重复，**不浪费**。

**背后的道理**：身份不是装饰，是**信任锚点**。读一条投资观点，第一时间想知道"这人是谁、来了多久、过去说过什么"。BBS 的视觉冗余（每楼都展示）是因为讨论非线性——你随时跳到第 27 楼，必须当场知道楼主是谁。

**对临介社区的启示**：当前只有 `user_karma` 视图（migration 0006 L87–100），无视觉化。完全照搬"等级条/勋章墙"会过度 gamification，但**老成员的视觉差异**值得做。建议：
- 不做"等级 99 / 勋章墙"这种露骨游戏化；
- karma ≥ X 的用户名后跟一个细描边小徽章（"老站友"/"Top 1%"），仅此一项；
- 评论楼层 hover 头像出 `UserHoverCard`：注册时间 + karma + 最近发帖数。

**具体落地点**：
- 新增 `src/components/profile/UserHoverCard.tsx`（shadcn HoverCard 包一层）。
- `src/components/posts/PostCard.tsx` L73–81 / L279–286 头像处接入。
- `src/components/posts/CommentTree.tsx` 同样接入。
- 数据：`user_karma` 已有；新增 `user_seniority` 视图（注册天数 + post_count + comment_count）放进 hover card；**不冗余到 PostCard 主行**——会破坏课 1 的密度。

---

## 课 5 · 时间感与"活着"信号

**观察到 / 常见做法**：BBS 在三处反复传达活力——①每行的"最后回复 X 分钟前"②首页顶部"今日发帖 N / 总帖数 N / 在线 N 人"统计条 ③用户名旁在线圆点。

**背后的道理**：社区类网站最怕"**鬼镇感**"。哪怕实际有 100 条新帖，只要视觉上没传达"刚刚有人在说话"，新用户就判断"这站凉了"。活力信号是**自证存在**——它说服浏览者"留下来值得"。和绝对在线人数无关，是节奏感问题。

**对临介社区的启示**：现状已经做对一部分（SmartTime、Realtime presence、UnreadStripe）。但 hero 区（feed/page.tsx L48–72）只是装饰渐变，**没有任何活力数据**。"今日讨论"是字面意思的字——下面没有"今日 N 帖 / N 人参与"。这是最便宜的活力升级。原则：轻量、低频更新、不闪烁不打断。

**具体落地点**：
- `src/app/(app)/feed/page.tsx` L48–72 hero：在 h1 下方加"今日 X 个新帖 · X 人活跃 · 最热版块：综合讨论"，server component 一次取，5 分钟缓存即可，**不做 realtime 数字跳动**——那是另一种廉价感。
- 数据走新视图 `daily_stats`。
- 头像在线圆点：已有 presence 基础（`usePresence`），目前只在聊天用；可在 PostCard L73 头像组件外加 `data-online` 状态环——但**只在 30 分钟内 last_seen 的用户身上点亮**（非实时 presence——那在 feed 上过载）。`0012_profiles_last_seen.sql` 的 `last_seen` 列正好够用。

---

## 课 6 · 分页 vs 无限滚动

**观察到 / 常见做法**：BBS **从来不用无限滚动**。永远是 `1, 2, 3, ..., 100, 跳转 [_]页 [Go]`。楼层页同理："1-20 楼 / 21-40 楼 / 末页"。

**背后的道理**：①**可引用性**——用户常说"详见 #25 楼"或"翻到 87 页"，没页码做不了；②**位置感**——3/100 还是 99/100 给读者进度反馈；③**回访 anchor**——明天接着读，URL 里的 `?page=12` 是唯一靠谱的书签；④**SEO**——无限滚动需要额外 `<a rel="next">` 工程才能让 Google 爬全。

**对临介社区的启示**：feed 用无限滚动合理（消费场景），但 **`/posts/[id]` 楼层、个人主页"TA 发的帖"、版块归档**这三种场景，BBS 风格分页更优。现状（FeedList.tsx L199–231）清一色 `LoadMore`，没分场景。

**具体落地点**：
- `src/components/posts/PostComments.tsx`：评论数 > 50 时切分页（每页 20 楼），URL 带 `?page=N`，每楼标 `#L{seq}` 锚点。
- `src/app/(app)/profile/[handle]/page.tsx` 的"TA 发的帖"用页码列表。
- `src/app/(app)/s/[slug]/page.tsx` 版块页保留无限滚动作 default，但提供 `?view=archive` 切分页归档视图。
- feed 主流不动。
- 不引入新依赖；Next.js searchParams + Supabase `range()` 即可。

---

## 课 7 · 视觉守旧 vs 功能完整

**观察到 / 常见做法**：BBS 视觉是 90 年代——细线表格、系统字体、乱七八糟图标、签名档放飞自我。但**功能极其完备**：草稿箱、附件管理、勋章中心、积分商店、屏蔽名单、版块订阅 RSS、邮件订阅、PM 站内信、版内置顶、合并主题、转移主题……

**背后的道理**：这套功能不是产品经理设计的，是**十几年用户行为反馈出的最小完备集**。"丑"的代价是审美，"砍掉草稿箱"的代价是用户写一半丢失。重新设计最大的诱惑就是"砍掉这些看似冗余的入口显得清爽"——这是**用克制设计的话语权吃掉社区功能完整性**，是非常昂贵的错误。

**对临介社区的启示**：哪怕暂时没做精，**入口位置要留好**。原则：克制设计 ≠ 功能砍半，而是按**使用频次分层**——高频在主行、低频进 overflow menu、超低频进设置页。"即使要丑也要保留入口"清单（按重要度）：

1. **草稿**：发帖中途断网/切窗，必须自动暂存。当前 `PostForm.tsx` 没看到草稿逻辑。
2. **屏蔽用户**：`profiles` 无 blocks 关系。社区不可避免有矛盾，没屏蔽会被几个键盘侠毁掉。
3. **附件管理**：用户应能看到"我上传过的所有图"。
4. **版块订阅 / 关注**：当前只有 `/following`（关注用户）。**关注版块**比关注用户更重要——用户不稳定，版块稳定。
5. **站内信**（已有 `messages`）保留。
6. **举报历史**：当前 ReportButton 只能新建，**用户看不到自己举报过什么**——影响信任。
7. **个人 RSS / 订阅源**：BBS 老传统。Next.js route handler 一文件成本极低，给重度用户的强信号。
8. **合并 / 转移主题**：管理员功能。`is_admin` 已有，但 `/admin` 下没看到这种治理工具。

**具体落地点**：
- `src/components/posts/PostForm.tsx`：localStorage 草稿，每 5s 保存。
- `supabase/migrations/0014_blocks.sql`（**建议新增**）：`user_blocks(blocker_id, blocked_id)` + feed/comments 查询里加 NOT EXISTS。
- `supabase/migrations/0015_section_follows.sql`（**建议新增**）：`section_follows(user_id, section_slug)`。
- `src/app/(app)/profile/[handle]/page.tsx`：增"我的举报"tab。
- `src/app/api/rss/[handle]/route.ts`、`src/app/api/rss/s/[slug]/route.ts`（**建议新增**）。
- `src/app/(app)/admin/`：增合并/转移主题。

> 与 UPGRADE-ROADMAP 边界：那份按"评论树/聊天/Feed 视觉"三方向；本课是"BBS 品类视角的功能完整性"，交集只在草稿与 RSS。

---

## 收尾 · 三档清单

### 立即可改（半天内、低风险）
1. PostCard `compact` 再压一档（课 1）：删 footer reactions、body 不渲染。
2. feed hero 加"今日 N 帖 / N 人活跃"一行（课 5）。
3. UserHoverCard 包头像（课 4）。

### 视野改造（按 sprint 安排）
1. `posts.last_activity_at` + `last_replier_id` 冗余列 + 触发器，PostCard 显示最后回复人（课 2）——本份最值得做的一件。
2. `sections.parent_slug` 层级化 + Sidebar 改 server fetch（课 3）——为"美股/A股/虚拟币"铺路。
3. PostComments 分页化（课 6），URL 带 `?page=N` + `#L{seq}` 锚点。

### 反对模式（不建议做）
1. **不要**把"等级条/勋章墙"塞进 PostCard——课 4 克制原则。
2. **不要**给 hero 数字加 realtime 跳动——课 5 廉价感。
3. **不要**把 feed 改成全分页——课 6，feed 是消费场景。
4. **不要**砍掉 ReportButton / ShareMenu / 草稿入口换"清爽"——课 7。
5. **不要**用 tag 系统替代版块层级——课 3，治理边界 vs 横切关注是两件事。
