# 临介社区 — 设计升级路线图

> 整合三份 GitHub 调研的落地清单：**评论树折叠**、**实时聊天**、**Feed 视觉**。
> 每条建议都给出"借鉴自哪里 / 改哪些文件 / 大致工作量"，按短期 / 中期 / 长期三档排列。

---

## 调研基线

| 方向 | 关键参考仓库（来自 `gh api` 真实返回） |
|---|---|
| 评论树折叠 | `LemmyNet/lemmy-ui`、`aeharding/voyager`、`clintonwoo/hackernews-react-graphql`、`LemmyNet/lemmy` |
| 实时聊天 | `WebDevSimplified/supabase-realtime-chat`、`lra8dev/SupabaseRealtimeChat.app`、`SamRome1/supabase-realtime-chat-template` |
| Feed 视觉 | `shadcn-ui/taxonomy`、`Kiranism/next-shadcn-dashboard-starter`、`magicuidesign/magicui`、`ncdai/chanhdai.com`、`arhamkhnz/next-shadcn-admin-dashboard` |

---

## 1. 短期落地（1–2 天，纯前端，零后端改动）

### 1.1 评论树
- **`useState<Set<string>>` 折叠态**：在 `CommentTree.tsx` 顶部维护折叠的 comment id 集合；header 加 `[-]/[+]` 按钮，折叠时只显示 1 行摘要。来源：lemmy-ui `CommentNodeState.collapsed`。
- **MAX_DEPTH = 6 截断**：超过 6 层渲染"继续讨论 →"占位（暂时锚回自己），后续接聚焦页。来源：voyager `ContinueThread`。
- **深度色环**：`border-l` 颜色按 `depth % 5` 取 5 套 Tailwind 颜色（slate/blue/green/amber/rose）。来源：lemmy-ui `colorList`。
- **改动文件**：`src/components/posts/CommentTree.tsx` 一处。

### 1.2 实时聊天
- **Optimistic UI 三态**：在 `useChatRoom` 里用 `crypto.randomUUID()` 先生成 id 推入本地 pending；server action 返回成功转 success，realtime 回环按 id 去重。来源：WebDevSimplified `ChatInput`。
- **修 `usePresence` dep 数组**：把 `useEffect` 的 dep 从整个 `self` 对象收窄到 `[self.id, channelKey]`，避免对象引用变化导致重订阅。来源：SamRome1 `Chat.tsx`。
- **`sendMessage` 联表带 author**：在 server action 的 `select` 里直接 join `profiles`，消除 `resolveAuthor` 的 N+1。来源：WebDevSimplified `messages.ts`。
- **改动文件**：`src/hooks/useChatRoom.ts`、`src/hooks/usePresence.ts`、`src/actions/`（聊天发送的 action）。

### 1.3 Feed 视觉
- **`EmptyPlaceholder` 组件**：复合 API（Icon / Title / Description / Action），给"还没有人发帖 / 没有匹配 / 加载失败"统一壳。来源：shadcn-ui/taxonomy。
- **`PostCard.Skeleton` 错落骨架**：vote 列、avatar、标题、摘要、reaction 行用 `h-5 w-2/5`、`h-4 w-4/5` 等不同比例的灰条，比统一灰块更接近真实节奏。来源：taxonomy `card-skeleton.tsx`。
- **未读视觉提示**：卡片左缘 `data-[state=unread]:border-l-2 border-l-brand-500` + 标题旁 1.5×1.5 圆点。来源：Kiranism `notification-card.tsx`。
- **SmartTime 收敛为相对时间**：`刚刚 / 5 分钟前 / 3 小时前 / 2 天前`，超过 7 天落 `MM-DD`。
- **改动文件**：新增 `src/components/empty-placeholder.tsx`；改 `src/components/posts/PostCard.tsx`、`PostListSkeleton.tsx`、`smart-time.tsx`。

---

## 2. 中期重构（1–2 周）

### 2.1 评论树
- **拆 `CommentTree.tsx` → `CommentList` + `CommentItem` + `CommentExpander`**。来源：voyager `inTree/` 五件套。
- **楼中楼聚焦页 `app/posts/[id]/c/[cid]/page.tsx`**：进入后只显示该 comment 的祖先链 + 子树。`PostComments.tsx` 增加 `focusCommentId` 入参。来源：voyager 模板。
- **`comments` 表加 `path` + `child_count` 列**：触发器在 INSERT 时拼 `parent.path || '.' || new.id`，DELETE 时递减 child_count。换成 `path LIKE 'X.%'` 按需懒加载。来源：lemmy 后端 `comment_view`。
- **`CommentExpander`**：当超过显示深度或当前已显示数量时显示"还有 N 条回复 →"。来源：voyager `CommentExpander.tsx`。
- **新增/改动**：拆 3 个组件文件 + 新增聚焦页路由 + `supabase/migrations/0011_comments_path.sql` + `PostComments.tsx` 懒加载逻辑。

### 2.2 实时聊天
- **`MessageList` 切到 `flex-col-reverse` + IntersectionObserver 分页**：第一条消息上挂触发器，prepend 时浏览器自动 anchor 在底部，**不用手动算 scrollTop**。`@tanstack/react-virtual` 保留作大列表二级优化。来源：WebDevSimplified `useInfiniteScrollChat`。
- **`useRealtimeChannel` 加重连补差**：监听 `system` 事件，`SUBSCRIBED` 时（重连）用 `>= last_seen_at` 拉一次增量。`filter` 拼接处对 `roomSlug` 做白名单转义，关掉注入面。
- **typing stopped 事件**：trailing-edge 或显式 broadcast `typing.stop`，避免 3s linger 在打字突然停止时延迟。
- **`last_seen + online` 双字段**：`profiles` 加 `last_seen timestamptz`，配合 presence 协议显示"X 分钟前在线"。来源：lra8dev。
- **改动**：`useChatRoom`、`useRealtimeChannel`、`MessageList`、`useTyping`，迁移加 `last_seen` 列。

### 2.3 Feed 视觉
- **排序换 shadcn `Tabs`**：trigger 显示 `热门(123)`，client 内部仅切渲染、保留服务端列表缓存。来源：Kiranism `notifications-page.tsx`。
- **`PostCard` 拆 Compound 组件**：`PostCard.Header / .Meta / .Body / .TickerStrip / .ActionBar`，`/feed` 之外的"问题页 / 个人主页帖子流"可复用。来源：arhamkhnz feature-first 结构。
- **微动效落地**：
  - 排序切换或"加载更多"成功后，新增 PostCard 用 `BlurFade` 渐入（仅追加项）。
  - VoteButtons 数字用 `NumberTicker` 替代纯文本。
  - 置顶徽标用 `BorderBeam` 或 `ShineBorder`。
  - 来源：magicui，源码可直接复制粘贴，零依赖。
- **紧凑列表模式**：在 `/feed` 顶部加视图切换（卡片 / 紧凑），紧凑模式 `divide-y rounded-md border` 无阴影，密度提升 1.5 倍。来源：taxonomy `PostItem`。
- **改动**：`PostCard.tsx` 拆分、`FeedList.tsx` 新增 view 切换、新增 `magicui/*` 源码组件。

---

## 3. 长期参考（思路存档，按优先级再启动）

### 3.1 评论树
- **虚拟滚动**：`flattenTree(roots)` + react-virtuoso（或现有 react-virtual），用 `depth` 数值控制 padding-left，HN 那种扁平化思路。
- **折叠态持久化**：localStorage 按 `postId` 命名空间存折叠 id 集；URL hash `#c-<id>` 自动滚动 + 高亮。来源：voyager `scrollCommentIntoViewIfNeeded`。
- **可切换排序**：评论页加 Hot/Top/New 选择器（当前只有 Q&A 的硬编码"已采纳→score→时间"）。来源：voyager `CommentSort.tsx`。

### 3.2 实时聊天
- **从 `postgres_changes` 迁到 private broadcast channel**：`supabase.realtime.setAuth()` + `private:true` + DB trigger 推 broadcast。好处：天然带鉴权、不再受 publication 限制、payload 一次带 author 字段、根除 N+1 与 filter 注入面。来源：WebDevSimplified `useRealtimeChat`。这是聊天层的"换地基"重构，需要新建 trigger 和 RLS 策略。

### 3.3 Feed 视觉系统
- **`--line` token 统一边线**：HSL 单值，浅色 `border-border/60`，深色 `border-border/40`，统一卡片、divider、ticker chip。**默认无阴影，hover 才出**。来源：chanhdai.com。
- **`CollapsibleList` 内联回复预览**：高评论帖在 feed 内就能展开看前 N 条回复，把"feed → 详情"两跳折叠为一跳，向 social feed 进化。来源：chanhdai `collapsible-list.tsx`。
- **`features/<domain>/` 顶层组织**：把 `src/components/posts/` 提升为 `src/features/posts/`，业务组件不再混入 `components/ui`。来源：arhamkhnz。

---

## 4. 一周冲刺建议

如果你只想做一周的工作量产出可见效果，按以下顺序：

| 天 | 事项 | 价值 |
|---|---|---|
| Day 1 | 评论折叠 + MAX_DEPTH 截断 + 深度色环 | 移动端体验立竿见影 |
| Day 2 | 聊天 optimistic + presence dep 修复 + author 联表 | 发消息从"卡顿等回环"变流畅 |
| Day 3 | EmptyPlaceholder + Skeleton + SmartTime 相对时间 | 视觉精度上一个档次 |
| Day 4 | 排序 Tabs + BlurFade + NumberTicker | feed 有"活了起来"的感觉 |
| Day 5 | `MessageList` 改 `flex-col-reverse` 分页 | 历史消息可滚动浏览 |
| Day 6 | PostCard 拆 Compound + 紧凑列表模式 | 后续复用与密度选项 |
| Day 7 | 缓冲日：跑 `npm run build`、修类型、清理 lint | 收口 |

中期的"`comments.path` 后端迁移"和长期的"broadcast channel 换地基"建议各自单独拉一个 sprint，不要塞进冲刺周。

---

## 5. 不建议立刻做

- **引入 Redux/Zustand**：voyager 的 `commentSlice` 是 web app 级方案，本项目当前规模 `useState`/`useReducer` 够用。
- **改 Tiptap → ProseMirror 直接驱动**：当前 Tiptap 已能输出可解析 jsonb，没有必要绕开抽象。
- **接入第三方搜索（Algolia/Meilisearch）**：先把 `pg_trgm` 的中文分词补上（`zhparser`/`pg_jieba`），观察是否够用再决定。
- **PWA 离线缓存策略**：等行情数据接入再统一规划。

---

## 附：文件改动清单（按文件聚合）

| 文件 | 改动 |
|---|---|
| `src/components/posts/CommentTree.tsx` | 折叠态 + MAX_DEPTH + 色环 → 拆为 `CommentList`/`CommentItem` |
| `src/components/posts/PostComments.tsx` | `focusCommentId` 入参 + `path LIKE` 懒加载 |
| `src/components/posts/PostCard.tsx` | 未读边线 + 状态圆点 → 拆 Compound 组件 |
| `src/components/posts/FeedList.tsx` | 排序 Tabs + 紧凑模式切换 + 追加项 BlurFade |
| `src/components/posts/PostListSkeleton.tsx` | 错落比例骨架 |
| `src/components/posts/VoteButtons.tsx` | NumberTicker 包数字 |
| `src/components/empty-placeholder.tsx` | **新增** |
| `src/components/smart-time.tsx` | 相对时间收敛 |
| `src/components/chat/MessageList.tsx` | `flex-col-reverse` + IntersectionObserver |
| `src/hooks/useChatRoom.ts` | optimistic 三态 + 客户端 id 去重 |
| `src/hooks/useRealtimeChannel.ts` | 重连补差 + filter 转义 |
| `src/hooks/usePresence.ts` | dep 数组收窄 |
| `src/hooks/useTyping.ts` | 显式 stopped 事件 |
| `src/actions/`（聊天 action） | `select` 联表带 author |
| `app/posts/[id]/c/[cid]/page.tsx` | **新增** 楼中楼聚焦页 |
| `supabase/migrations/0011_comments_path.sql` | **新增** path + child_count 列与触发器 |
| `supabase/migrations/0012_profiles_last_seen.sql` | **新增** profiles.last_seen 列 |
| `magicui/animated-list.tsx`、`blur-fade.tsx`、`number-ticker.tsx` | **新增**（直接复制粘贴） |
