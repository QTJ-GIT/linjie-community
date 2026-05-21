# 临介社区 — 变更日志

> 单一权威 CHANGELOG。本文按时间顺序合并了三段冲刺的所有改动：Week 1 体验升级、全站 UI 重设计、Week 2 经验吸收 / 漏接补齐。
> 详细设计动机和路线图见 `docs/UPGRADE-ROADMAP.md` / `docs/MOTION-RECIPES.md` / `docs/WEB-DESIGN-PRINCIPLES.md` / `docs/STUDY-bbs-design.md` / `docs/STUDY-trading-community-lessons.md`。

---

## 阶段一 · Week 1 Sprint（Day 1–7，2026-05-13）

> 一周冲刺：评论体验、聊天体验、Feed 视觉。**只动前端 + hooks，不改数据库**。

### 评论体验
- `CommentTree.tsx` 折叠态（`useState<Set<string>>`），`[-]/[+]` 切换
- 深度截断 `MAX_COMMENT_DEPTH = 6`，超限渲染"继续讨论 →"占位
- `border-l` 颜色按 `depth % 5` 取色环
- 每节点 `id="c-{id}"` 锚点

### 聊天体验
- `useChatRoom` / `useDmThread` 切到 **Optimistic UI 三态**（pending / success / error）：客户端 `crypto.randomUUID()` 生成 id，realtime 回环按 id 去重
- 发送路径 `.insert(...).select('*, author:profiles(...)').single()` 联表带 author，根除 N+1
- `usePresence` 依赖数组从整个 `self` 对象收窄到 `selfId`，避免父组件 re-render 重订阅
- `MessageList` 改 `flex-col-reverse` + IntersectionObserver 历史消息分页（`useInfiniteScrollChat`）
- 消息状态映射样式：pending `opacity-60`，error `border-destructive/40 + bg-destructive/10`
- 临时禁用 react-virtual 虚拟化分支（与 flex-col-reverse 共存方案留中期）

### Feed 视觉
- `formatRelative` 收敛为「刚刚 / X 分钟前 / X 小时前 / X 天前 / MM-DD」
- `PostListSkeleton` 改用 `Skeleton` 组件 + 错落比例
- 排序导航换 Tabs 视觉
- 视图模式 URL 驱动 `?view=card|compact`
- `PostCard` 拆为 Compound（`.Vote / .Header / .Body / .Footer`）
- `LoadMore` 追加项用 `BlurFade` 包裹
- 未读边线：`useLastVisited` + `UnreadStripe` + `FeedVisitMarker`，纯 localStorage

### 新增文件
- `src/components/transitions/BlurFade.tsx`
- `src/components/posts/UnreadStripe.tsx`
- `src/components/posts/FeedVisitMarker.tsx`
- `src/components/posts/FeedViewToggle.tsx`
- `src/hooks/useLastVisited.ts`
- `src/hooks/useInfiniteScrollChat.ts`

---

## 阶段二 · 全站 UI 重设计（Vercel/shadcn × Substack）

> 亮色为主、克制留白、首屏重 / 列表轻。

### 新增

- `src/components/effects/`（11 组件）：`Aurora` / `Spotlight` / `GradientMesh` / `GlowCard` / `MagneticButton` / `GradientText` / `Typewriter` / `ScrollReveal` + `ScrollRevealItem` / `NumberTicker` / `TiltGloss` / `GlassPanel`，全部尊重 `prefers-reduced-motion`
- `src/components/landing/LandingCta.tsx`
- `src/components/posts/FeedScrollReveal.tsx`
- `globals.css` 加 `.prose-post` 中文阅读流（行高 1.8、引用左线、code 风格）
- `tailwind.config.ts` 新增 `fontFamily.display` / `fontFamily.mono`

### 重做的页面

| 路由 | 改动要点 |
|---|---|
| `/` | Aurora + GradientText + Typewriter + NumberTicker + GlassPanel 三特性卡 + ScrollReveal + Magnetic CTA |
| `/feed` | 低高度 GradientMesh hero + 细线 underline 排序 + view toggle |
| `/posts/[id]` | breadcrumb + display 标题 + 横向作者卡 + `.prose-post` 正文 |
| `/chat/[room]` + `/messages/[threadId]` | 玻璃 header + typing 提示移到 header 底部 + 输入框圆角 brand focus + kbd 提示。DM 自己气泡改 brand-500 弱版本 |
| `/tickers/[symbol]` | Spotlight + GradientMesh hero + mono ticker 大字 + 静态 sparkline 占位（标 `// TODO 接行情`） |
| `/tickers` | grid 去 Card 重边框，单层细线 |
| `/(auth)/layout.tsx` | Aurora 极简 auth 卡 |

### 共享组件级
`PostCard` / `PostListSkeleton` / `CommentTree` / `EmptyState` / `Sidebar` / `Navbar` / `DmList` / `Logo` 全部柔化边框、tracking 细化、active 态改 2px 横条；**Compound API 不动**。

---

## 阶段三 · Push 推送下架

> "这是网页，不是 app"——拆掉 Web Push 整套基础设施。

### 删除
- `src/components/push/PushToggle.tsx`
- `src/lib/push-client.ts` / `push-server.ts`
- `src/app/api/push/{send,subscribe,test,unsubscribe}/route.ts`
- `public/sw.js`（service worker）
- `docs/group-l-integration.md`

### 修改
- `src/app/(app)/profile/edit/page.tsx`：移除"桌面推送通知"卡片
- `src/types/domain.ts`：删 `PushSubscriptionRow`
- `package.json`：去 `web-push` 与 `@types/web-push`
- `.env.example`：删 VAPID 段
- `docs/DESIGN.md`：技术栈 / 数据模型图 / RLS 表 / env 表的 push 行全去掉，第 7 章改为"仅站内通知"

### 新增
- `supabase/migrations/0013_drop_push_subscriptions.sql`（drop table + 策略）

### 用户操作
- 跑 `npm install` 同步 lock
- 跑过 0010 的话，需在 SQL Editor 跑 0013 清掉数据库残留

---

## 阶段四 · XSS 缺口紧急修复

> 来源：`STUDY-trading-community-lessons.md` 代理审计发现。

`PostBody.tsx` 渲染 Tiptap link mark 的 `href` 和 image node 的 `src` **没校验 scheme**——`javascript:alert(1)` 落库后任何 viewer 点链接就触发 stored XSS。

### 修复
- 加 `SAFE_LINK_RE = /^(?:https?:|mailto:|\/|#)/i`、`SAFE_IMG_RE = /^(?:https?:|\/|data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml);)/i` 白名单
- `safeLinkHref()` / `safeImgSrc()` 工具函数
- 不安全 link 退化为纯文本（不渲染 `<a>`），不安全 img 整个不渲染

---

## 阶段五 · 经验吸收 7 项 Backlog（5 波次）

> 来源：四份学习文档（MOTION-RECIPES / WEB-DESIGN-PRINCIPLES / STUDY-bbs-design / STUDY-trading-community-lessons）的具体跟进项，分波次落地。

### Wave 1（并行 3 项，无文件冲突）

| 项 | 改动 | 迁移 |
|---|---|---|
| **B · Feed hero 活力数据条** | `feed/page.tsx` 加 `unstable_cache`(300s) 包的 `getFeedStats`：今日 N 帖 · N 人活跃 · 最热版块 X | — |
| **E · UnreadStripe a11y** | 加 `<span className="sr-only">未读</span>`，颜色不再是单一信息载体 | — |
| **G · globals.css reduced-motion 兜底** | 全局 `@media (prefers-reduced-motion: reduce)`，所有 `*` 的 animation/transition 强制 0.01ms | — |

### Wave 2 · D · PostCard / CommentTree 拆子目录

`PostCard.tsx` 拆出 `post-card/{Vote,Header,Body,Footer}.tsx`（4 文件），主入口 140 行。`CommentTree.tsx` 拆出 `comments/{CommentItem,CommentMeta,CommentActions,CommentChildren,constants}.tsx`（5 文件）。所有公开 API + 视觉行为 100% 保留，最大文件 191 行（满足 ≤ 200 行约束）。

### Wave 3 · F · 评论计数防抖动

`post-card/Footer.tsx` 评论计数 span 加 `inline-block min-w-[2ch] text-right tabular-nums`，消除 9→10 时 1px 行抖动。

### Wave 4 · A · 活线程列（**含 0014 迁移**）

把"内容流"升级为"活线程列表"——BBS 经验的核心一步。

- **新迁移** `0014_post_last_activity.sql`：
  - `posts` 加 `last_activity_at timestamptz` + `last_replier_id uuid`（**显式命名 FK** `posts_last_replier_id_fkey`，PostgREST 多 FK 消歧必需）
  - 索引 `posts_last_activity_idx (last_activity_at desc nulls last)`
  - 幂等 backfill：每帖最新一条非软删评论的 created_at + author_id；无评论的 fallback 到 post.created_at
  - 触发器 `tg_post_bump_last_activity`（comments AFTER INSERT 时同步）
- 类型 `Post` + `PostWithAuthor` 加 optional `last_activity_at` / `last_replier_id` / `last_replier`
- `FeedList` SELECT 联表 `last_replier:profiles!posts_last_replier_id_fkey(...)`
- `post-card/Footer.tsx` footer 加"X 分钟前由 @handle"小区块（仅当 `last_activity_at !== created_at`）

### Wave 5 · C · 版块层级化（**含 0015 迁移**）

为后续加"美股 / A股 / 虚拟币"等子版块做数据模型铺垫。

- **新迁移** `0015_sections_hierarchy.sql`：
  - `sections` 加 `parent_slug text`（自引用 FK `sections_parent_slug_fkey`） + `sort_order smallint default 100`
  - 索引 `sections_parent_sort_idx (parent_slug nulls first, sort_order)`
  - 给现有三个版块写稳定 `sort_order`（10/20/30），不插子版块
- `types/domain.ts`：`SectionSlug` 字面量联合改 `string`（widen，向后兼容），新增 `Section` / `SectionTreeNode`
- 新建 `src/lib/sections.ts`：`fetchAllSections` / `buildSectionTree` / `getSectionTree`（unstable_cache 300s）
- `Sidebar.tsx` 加 `sectionTree?: SectionTreeNode[]` prop，递归渲染嵌套（`pl-6` / `pl-9` 缩进）
- `(app)/layout.tsx` 拉 sectionTree 传入 Sidebar
- `posts/[id]/edit/page.tsx`：`SectionSlug` 改从 `@/lib/validators/post` 导入 narrow union（widen 后唯一冲突点）

---

## 阶段六 · 漏接的 DB 功能补齐（Migration ahead of code）

> 审计发现 0011 / 0012 已定义功能但前端从未接入。这一轮全部接上，**不出新迁移**。

| 补 | 改动 | 依赖迁移 |
|---|---|---|
| **1 · 心跳 hook** | 新建 `useHeartbeat.ts`（`touch_last_seen` RPC + Page Visibility API + 60s 间隔），新建 `HeartbeatTicker.tsx` 在 `(app)/layout.tsx` 仅登录用户挂载 | 0012 |
| **2 · 活跃用户面板** | 新建 `lib/active-users.ts`（`getActiveUsers` 包 30s `unstable_cache`），新建 `shell/ActiveUsersPanel.tsx`（Server Component），`Sidebar.tsx` 加 `activeUsersSlot` prop（RSC children-as-prop 跨 client/server 边界），`(app)/layout.tsx` 仅登录用户传入 | 0012 |
| **3 · 楼中楼聚焦页** | 新建 `app/(app)/posts/[id]/c/[cid]/page.tsx`：`comments.path LIKE 'X.%'` 拉子树 + 祖先链卡片 + 复用 `<CommentTree>`，`metadata.robots: noindex`。`comments/CommentChildren.tsx` 把"继续讨论"href 从 `#c-{id}` 改路由 `/posts/[id]/c/[cid]`。`types/domain.ts` 给 `Comment` 加 optional `path` / `depth` / `child_count` | 0011 |

---

## 迁移清单（截至 2026-05-14）

| # | 文件 | 内容 | 状态 |
|---|---|---|---|
| 0001 | `0001_init_schema.sql` | profiles / sections / posts / comments / likes / bookmarks / tickers / post_tickers / chat_rooms / chat_messages / notifications | 必跑 |
| 0002 | `0002_rls_policies.sql` | 11 表 RLS | 必跑 |
| 0003 | `0003_functions_triggers.sql` | updated_at / handle_new_user / cashtag 提取 / notify 派发 / Realtime publication（chat_messages, notifications, comments） | 必跑 |
| 0004 | `0004_seed_tickers.sql` | tickers seed | 必跑 |
| 0005 | `0005_storage.sql` | avatars + post-images bucket + RLS | 必跑 |
| 0006 | `0006_votes_sentiment_karma.sql` | likes 升级为投票（value=±1） + posts/comments.score + sentiment + user_karma 视图 | 必跑 |
| 0007 | `0007_follows_dm.sql` | follows / ticker_follows / dm_threads / dm_messages + RPC `dm_get_or_create_thread` | 必跑 |
| 0008 | `0008_reactions_polls.sql` | reactions / polls / poll_options / poll_votes | 必跑 |
| 0009 | `0009_admin_reports.sql` | profiles.is_admin / posts.is_pinned / `is_admin()` RPC / reports + report_pending_count 视图 | 必跑 |
| 0010 | `0010_push_subscriptions.sql` | push_subscriptions（已下架） | **已跑 → 跑 0013；未跑 → 跳过** |
| 0011 | `0011_comments_path.sql` | comments.path / depth / child_count + 触发器 + backfill | 必跑 |
| 0012 | `0012_profiles_last_seen.sql` | profiles.last_seen + `touch_last_seen()` RPC + recently_active_users 视图 | 必跑 |
| 0013 | `0013_drop_push_subscriptions.sql` | drop push_subscriptions | 仅在跑过 0010 时跑 |
| 0014 | `0014_post_last_activity.sql` | posts.last_activity_at + last_replier_id + 触发器 + backfill | 必跑 |
| 0015 | `0015_sections_hierarchy.sql` | sections.parent_slug + sort_order | 必跑 |

**所有迁移均 idempotent**（`add column if not exists`、`drop trigger if exists` then `create`、`do $$ ... duplicate_object` 包 FK 创建），可任意次重跑。

---

## 验证

每个阶段都跑过：
- `npm run lint` ✓ 零警告零错误
- `npm run build` ✓ 全部路由静态生成、零 TS 错误

---

## 阶段七 · 设计页打磨 + 可视化 + Bug 修复（2026-05-14）

> 5 个设计代理 + 1 轮按钮审计 + 1 个 cookies-in-cache 修复。**无新迁移**。

### 7.1 次要列表页打磨

| 路由 | 改动 |
|---|---|
| `/notifications` | hero + kind underline tabs（`?kind=mention\|comment\|like\|answer_accepted\|all`），未读项左缘 brand 竖线 + 头像红点，全部已读按钮 |
| `/bookmarks` | hero + 收藏数 + view 切换（card / compact，URL 驱动），EmptyState |
| `/search` | hero 内嵌 GET 表单 + scope chips（帖子 active；用户 / Ticker 标"待开放"），三态空（未输入 / 无结果 / 加载中），结果 compact 列表 |

`FeedViewToggle` 通用化：加 `basePath` + `extraParams` 两个 optional prop，`/feed` 老调用一字未改。

### 7.2 `/profile/[handle]` 重做

| 文件 | 角色 |
|---|---|
| `src/components/profile/ProfileHero.tsx` | GradientMesh 200px hero + Avatar 重叠 + display 字号 name + mono handle + bio + Follow / 私信 |
| `src/components/profile/ProfileStats.tsx` | 4 列 grid divider：Karma / Posts / Comments / Followers，数字用 `<NumberTicker>` |
| `src/components/profile/ProfileTabs.tsx` | URL 驱动 underline tabs（`?tab=posts\|comments\|about`） |
| `src/app/(app)/profile/[handle]/page.tsx` | server fetch 5 项 count（Promise.all）+ 当前 tab 内容（posts/comments 才查） |

### 7.3 `/trending` 升级

| 文件 | 改动 |
|---|---|
| `src/app/(app)/trending/page.tsx` | hero + 24h 活跃 ticker section + 热度榜前 10 |
| `src/components/posts/TickerBarChart.tsx`（新） | 纯 Tailwind 横向条形：mono symbol + 相对宽度 bar + 帖数 |
| `src/components/posts/TrendingPostRow.tsx`（新） | rank 大字 + 相对热度细 bar + compact PostCard，热度归一化按 maxHot - minHot |

### 7.4 按钮审计 + 3 处 bug 修复

| # | 位置 | bug | 修复 |
|---|---|---|---|
| 🔴 | `src/components/landing/LandingCta.tsx` | `<Link>` 包 `<MagneticButton>` —— button 嵌 anchor 不合法 HTML，浏览器吞掉导航。**用户报告"进入大厅进不去"的根因** | 改 `useRouter().push('/feed')` 在 MagneticButton onClick |
| 🟠 | `src/app/(app)/notifications/page-client.tsx:167` | `buildHref` 返回 `/p/${id}`，但实际路由是 `/posts/${id}` —— 点任何通知 404 | 改 `/p/` → `/posts/` |
| 🟡 | `src/app/(app)/bookmarks/page.tsx` | "管理收藏"链接指向 `/profile/edit` 但那里没书签管理 | 删链接 |

### 7.5 `unstable_cache` × `cookies()` 修复

3 个 helper 在 `unstable_cache` scope 内调了 cookies-based `createClient()` —— Next 14 不允许，运行时 throw `Route /feed used "cookies" inside a function cached with "unstable_cache(...)"`。

| 文件 | 改动 |
|---|---|
| `src/app/(app)/feed/page.tsx` | `getFeedStats` 内换 `createAdminClient()`（service role，无 cookies） |
| `src/lib/sections.ts` | 加 `fetchAllSectionsPublic()`（admin）专给 cache 用；保留 `fetchAllSections()`（cookies）非 cache 场景用 |
| `src/lib/active-users.ts` | `getActiveUsers` 内换 admin client |

**为什么用 admin 安全**：这 3 处读的全是公开聚合数据（post counts / sections 列表 / recently_active_users 视图返回的公开字段），与 viewer 身份无关，service role 绕过 RLS 不会泄露 private 信息。

### 7.6 验证

- `npm run lint` ✓
- `npm run build` ✓ 27+ 路由全过、零 TS 错误（每个代理完成时各自跑过）

### 7.7 不在范围

- `/posts/new`、`/posts/[id]/edit`、`/posts/[id]/poll`（创作流，表单密集，重设计价值不大）
- `/admin/*`（后台简洁实用够用）
- `/profile/edit`（表单页，无视觉升级需求）
- `TrendingPostRow` 整行不可点（rank 数字非 link，PostCard 内部 link 各自工作 —— 留待后续 UX 决定）

---


- private broadcast channel + DB trigger 重构（聊天换地基）
- typing stopped 显式事件
- `useRealtimeChannel` 重连补差（gap fill）
- `MessageList` 虚拟化与 `flex-col-reverse` 共存
- `features/` 目录重组
- 视觉系统化（`--line` token、无阴影策略全局推开）
- 行情数据接入 ticker page sparkline

来自 `MOTION-RECIPES.md` 未落地项：
- CommentTree 折叠 UI 加 `<motion.div layout>` + `AnimatePresence` 高度过渡
- `<MotionList popLayout>` 抽象封装

这些都是有意保留的下个 sprint 范围。
