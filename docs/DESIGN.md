# 临介社区 — 设计文档

> Next.js 14 + Supabase 的中文垂直社区，面向"讨论 + 问答 + 股票话题 + 实时聊天"四合一形态。
> 本文档描述系统目标、架构边界、数据模型、关键流程与扩展路径。

---

## 1. 产品定位

### 1.1 目标用户
聚焦**股票/投资讨论**的中文社区，但保留通用论坛能力。典型场景：
- 在 `/feed` 浏览全站热帖
- 在 `$AAPL` 话题页查看相关帖子并进入该股票专属聊天室
- 在 Q&A 区提问、采纳最佳答案
- 关注用户/股票，按 following feed 阅读

### 1.2 核心场景
| 场景 | 入口 | 说明 |
|---|---|---|
| 浏览 | `/feed` `/trending` `/following` | 三种排序：新/热/关注 |
| 分区 | `/s/general` `/s/qa` `/s/stocks` | section 维度筛选 |
| 股票话题 | `/tickers/[symbol]` | 帖子流 + 专属聊天室 |
| 创作 | `/posts/new` | Tiptap 富文本，支持 `$AAPL` 自动识别 |
| 互动 | 帖子页 | 评论树、投票、表情、收藏、分享 |
| 私信 | `/messages/[threadId]` | 1:1 实时会话 |
| 全局聊天 | `/chat/lobby` | 大厅 + 各 ticker 房间 |
| 通知 | `/notifications` | 站内 + Web Push |
| 后台 | `/admin` | 举报/置顶/封禁 |

### 1.3 非目标
- **不做**多语言、移动原生 app、第三方 OAuth（仅邮箱）。
- **不做**实时行情数据（`tickers` 表只存 symbol 元数据，行情接入后续再说）。
- **不做**复杂权限分级（仅 `is_admin` 一级）。

---

## 2. 技术选型

| 层 | 选择 | 理由 |
|---|---|---|
| 框架 | Next.js 14（App Router、Server Actions） | RSC 减少客户端水合；Server Actions 取代单独 API 路由 |
| 数据库 | Supabase Postgres | 原生 RLS + Auth + Realtime，省去自建鉴权层 |
| 鉴权 | Supabase Auth（邮箱） | 与 RLS 直连，`auth.uid()` 在 SQL 内可用 |
| 样式 | Tailwind + shadcn/ui + Radix | 设计一致性 + 可访问性 |
| 富文本 | Tiptap (StarterKit + Image + Link + Mention) | JSON 结构化存储，便于服务端解析 cashtag/mention |
| 表单 | react-hook-form + zod | 客户端 + 服务端共用 schema |
| 实时 | Supabase Realtime（postgres_changes + presence + broadcast） | 一套连接覆盖聊天/通知/在线状态/正在输入 |
| 虚拟列表 | @tanstack/react-virtual | feed/messages 长列表性能 |
| 动画 | framer-motion + 自研 transitions | 路由切换、点赞反馈 |

---

## 3. 系统架构

```
┌──────────────────────────────────────────────────────────────┐
│                       Browser                                │
│  - RSC HTML  - Realtime WS  - Service Worker (Web Push)      │
└────────┬─────────────────────────────────────────┬───────────┘
         │ HTTPS                                   │ WS
┌────────▼──────────────────┐         ┌────────────▼──────────┐
│  Next.js (App Router)     │         │  Supabase Realtime    │
│                           │         │  (postgres_changes,   │
│  ├─ (auth) /login /signup │         │   presence, broadcast)│
│  ├─ (app)  /feed  /posts  │         └────────────┬──────────┘
│  │         /chat  /admin  │                      │
│  ├─ /api/push/*           │                      │
│  └─ middleware.ts (auth)  │                      │
│                           │                      │
│  Server Actions:          │  Service Role        │
│   posts/comments/votes/   │  (admin.ts only)     │
│   follows/dm/reactions/   │                      │
│   polls/reports/admin     │                      │
└────────┬──────────────────┘                      │
         │ supabase-js                             │
┌────────▼─────────────────────────────────────────▼──────────┐
│                     Supabase Postgres                       │
│   profiles · posts · comments · likes · bookmarks           │
│   tickers · post_tickers · chat_rooms · chat_messages       │
│   follows · ticker_follows · dm_threads · dm_messages       │
│   reactions · polls · poll_options · poll_votes             │
│   reports · notifications                                  │
│                                                             │
│   触发器：cashtag 提取、score 维护、通知派发                 │
│   RLS：所有表按 auth.uid() 控制读写                         │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 渲染策略
- **RSC 默认**：`feed`、帖子页、profile 页都是 Server Component，数据库查询直接走 server client（Cookie 中的 session 自动携带）。
- **Client Components**：交互密集（投票、评论框、聊天、通知铃铛、富文本编辑器）。
- **Server Actions**：所有写入路径统一走 `src/actions/*.ts`，避免裸露的 REST API。

### 3.2 鉴权流
1. `middleware.ts` 在每次请求前调用 `lib/supabase/middleware.ts`，刷新 cookie 中的 session。
2. Server Component 通过 `lib/supabase/server.ts` 创建带 session 的 client，查询自动受 RLS 约束。
3. Server Action 同样使用 server client，写入语句的 `auth.uid()` 由 Postgres 端校验。
4. 极少数运维操作（如管理员封禁）使用 `lib/supabase/admin.ts`（service role），**仅在 `actions/admin.ts` 中且需先校验 `is_admin()`**。

### 3.3 四种 Supabase Client 的边界
| 文件 | 何时使用 | 是否绕过 RLS |
|---|---|---|
| `client.ts` | Client Component 浏览器内（订阅 Realtime、客户端 fetch） | 否（anon key + session） |
| `server.ts` | RSC、Server Action | 否（cookie session） |
| `middleware.ts` | `middleware.ts` 中刷新 token | 否 |
| `admin.ts` | 管理员后台、push fan-out | **是**（service role）— 必须先验权 |

---

## 4. 数据模型

### 4.1 核心实体

```
profiles 1──N posts 1──N comments
profiles 1──N comments
posts    N──N tickers   (post_tickers, 触发器自动维护)
profiles N──N profiles  (follows)
profiles N──N tickers   (ticker_follows)
posts    1──1 polls 1──N poll_options 1──N poll_votes
*        N──N reactions  (target_type/target_id 多态)
profiles 1──N notifications
profiles N──N profiles  (dm_threads + dm_messages)
```

### 4.2 关键设计决策

**likes = votes（合并）**
0001 中的 `likes` 表在 0006 升级为投票：新增 `value smallint check (value in (-1, 1))`。点赞 = upvote，反对 = downvote，主键 `(user_id, post_id, comment_id)` 保证一人一票，UPDATE 可翻转。

**score 反范式 + 触发器**
`posts.score` / `comments.score` 由 `tg_update_score` 在 likes INSERT/UPDATE/DELETE 时增量维护。避免每次排序时 `count()`。

**热度 hot_score**
`src/lib/hot-score.ts` 实现 reddit 风格：`log10(|score|) + sign(score) * (createdAt - epoch) / 45000`。在客户端排序，不在 DB 计算。

**Q&A 与帖子同表**
`posts.type ∈ {post, question}`，`posts.accepted_answer_id` 指向 `comments.id`（外键 deferrable，因为环形依赖）。`comments.is_answer` 标记被采纳的答案。

**Cashtag 双端识别**
- 前端：`src/lib/cashtags.ts` 用正则 `\$([A-Z]{1,5}|[0-9]{6})` 高亮显示。
- 后端：Postgres 触发器在 `posts` insert/update 时扫描 `body_text`，匹配且存在于 `tickers` 表的符号写入 `post_tickers`。
- 这样无论从 Server Action 还是直接 SQL 写入，关联都不会丢。

**通知多态**
`notifications.kind ∈ {comment_on_post, reply_to_comment, mention, answer_accepted, like}`，可空 `post_id` / `comment_id`。新增类型只需加 enum + trigger 分支。

**反应表多态**
`reactions(target_type, target_id, emoji)`：post / comment / chat_message 共用一张表，主键含 emoji，所以可同时贴多个表情。

**私信线程**
`dm_threads (user_a, user_b)` + `dm_messages`。`user_a < user_b` 约束保证线程唯一（`openThreadWith` 在 action 里规范化两端 ID）。

**user_karma 视图**
`profiles` × `posts.score` + `comments.score` 求和。视图继承底层 RLS，无副作用。

### 4.3 索引策略
- `posts (section_slug, created_at desc)`：分区列表
- `posts (score desc, created_at desc)`：热度排序
- `posts using gin (body_text gin_trgm_ops)`：模糊搜索（pg_trgm）
- `posts_pinned_idx where is_pinned`：部分索引，置顶很少
- `notifications_unread_idx where read_at is null`：未读铃铛 query
- `chat_messages (room_slug, created_at desc)`：拉取最近 N 条

---

## 5. 行级安全（RLS）

所有表都启用 RLS。统一原则：

| 操作 | 默认策略 |
|---|---|
| SELECT | 大多数表 `using (true)`（公开内容）；`dm_*`、`notifications` 限 `auth.uid()` 自己 |
| INSERT | `with check (auth.uid() = author_id / user_id)` |
| UPDATE | 仅作者或管理员（用 `is_admin()` helper） |
| DELETE | 通常软删（`is_deleted = true`），物理删仅作者/管理员 |

`is_admin()` 是 SQL 函数（SECURITY DEFINER + STABLE），可在策略中直接调用，绕过 `profiles` 自身的 RLS 读取自己的 admin 标记。

---

## 6. 实时（Realtime）

### 6.1 三种通道
| 机制 | 用途 | 表/topic |
|---|---|---|
| `postgres_changes` | 数据变更同步 | `chat_messages`、`notifications`、`comments`、`reactions` |
| `presence` | 在线状态、未读数 | 房间 slug / 私信线程 ID |
| `broadcast` | 正在输入提示 | 房间 slug |

发送/订阅集中在 `src/hooks/`：
- `useRealtimeChannel`：通用封装
- `useChatRoom` / `useDmThread`：聊天室、私信
- `useNotifications`：未读通知与铃铛
- `usePresence` / `useTyping`：在线 + typing

### 6.2 publication 配置
`supabase_realtime` 必须包含：`chat_messages`、`notifications`、`comments`、`reactions`、`dm_messages`。在 0001/0008 迁移末尾添加 `alter publication supabase_realtime add table ...`。

---

## 7. 通知

### 7.1 站内通知
- 由触发器在 comment/like/mention/answer_accepted 时插入 `notifications`。
- 客户端通过 Realtime 订阅 `notifications where recipient_id = me`，未读数实时更新。
- `read_at` 在用户打开 `/notifications` 或铃铛下拉时由 server action 批量回写。

> Web Push 已下架（migration `0013_drop_push_subscriptions.sql`）。本项目定位为网页，不再做桌面推送通知。

---

## 8. 内容创作

### 8.1 Tiptap → JSON + 纯文本双写
`posts.body_json` 存 Tiptap 文档（jsonb），渲染保留富文本；`posts.body_text` 存抽取的纯文本，用于：
1. 触发器扫 cashtag
2. pg_trgm 模糊搜索
3. 通知/卡片预览

抽取由 `src/lib/tiptap-to-text.ts` 在 server action 里完成，避免触发器写复杂的 jsonb 解析。

### 8.2 表单校验
`src/lib/validators/{post,comment,profile}.ts` 用 zod。Server action 入口必先 `schema.parse()`，前端 `react-hook-form` 共用同一 schema。

### 8.3 图片上传
- 使用 Supabase Storage（0005 迁移建桶 `posts`、`avatars`，按用户 prefix）。
- `src/lib/upload.ts` 在客户端直传。
- RLS：写入限 `name like auth.uid() || '/%'`。

---

## 9. 模块清单

### 9.1 路由
```
src/app/
├─ (auth)/         登录、注册、回调
├─ (app)/
│  ├─ feed/        首页全站流
│  ├─ trending/    热度排序
│  ├─ following/   关注流（用户 + ticker）
│  ├─ s/[slug]/    分区列表
│  ├─ posts/[id]/  详情 + 评论
│  ├─ posts/new/   创作
│  ├─ tickers/[symbol]/   股票话题（帖子 + 聊天）
│  ├─ chat/        聊天室列表 + 房间
│  ├─ messages/[threadId]/ 私信
│  ├─ profile/[handle]/    个人主页
│  ├─ notifications/
│  ├─ bookmarks/
│  ├─ search/
│  ├─ admin/       后台
│  └─ showcase/    UI 组件展示页
└─ api/push/*      Web Push 端点
```

### 9.2 Server Actions（`src/actions/`）
| 文件 | 职责 |
|---|---|
| `posts.ts` | create/update/delete/pin/setSentiment |
| `comments.ts` | create/update/delete/markAsAnswer |
| `votes.ts` | upvote/downvote/clearVote |
| `bookmarks.ts` | toggle |
| `follows.ts` | followUser/unfollowUser/followTicker |
| `dm.ts` | openThreadWith/sendMessage/markRead |
| `reactions.ts` | toggleReaction |
| `polls.ts` | createPoll/vote/closePoll |
| `notifications.ts` | markRead/markAllRead |
| `profile.ts` | updateProfile |
| `feed.ts` | 分页 + 排序聚合 |
| `answers.ts` | accept/unaccept |
| `reports.ts` | report/resolve/dismiss |
| `admin.ts` | banUser/togglePin/setAdmin（service role） |

### 9.3 hooks
| hook | 说明 |
|---|---|
| `useRealtimeChannel` | 创建 + cleanup channel |
| `useChatRoom` | 聊天室消息 + presence + typing |
| `useDmThread` | 私信线程 |
| `useNotifications` | 未读列表 |
| `usePresence` | 在线状态 |
| `useTyping` | broadcast typing |
| `useReactions` | 反应聚合 |
| `useHotkeys` | `j/k`、`n` 等键盘快捷键 |
| `useReducedMotion` | 减少动画 |

---

## 10. 可观察性 / 性能

- **N+1 防护**：feed/profile 的关联（作者、score、是否点赞、ticker）通过 `select(*, profile:profiles(...), my_vote:likes(value))` 一次拉齐。
- **虚拟列表**：聊天 + 长 feed 用 `@tanstack/react-virtual`。
- **图片懒加载**：Next `<Image>` + Storage 公网 URL。
- **缓存**：RSC 路由开启默认缓存；写入路径用 `revalidatePath` 精准失效。
- **build 校验**：`tsconfig.tsbuildinfo` + `npm run build` 在 CI 中作为门禁。

---

## 11. 开发与部署

### 11.1 本地启动
```bash
cp .env.example .env.local
# 填三个 Supabase key
npm install
npm run dev
```

### 11.2 数据库迁移
仍是手动粘贴到 Supabase SQL Editor（顺序执行 0001 → 0010）。后续可改为 `supabase db push`，但当前没有 Supabase CLI 依赖。

### 11.3 环境变量
| key | 说明 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 浏览器/RSC client |
| `SUPABASE_SERVICE_ROLE_KEY` | admin 后台、服务端管理任务（**仅服务端**） |
| `NEXT_PUBLIC_SITE_URL` | 邮件、分享链接 |

---

## 12. 风险与待办

| 风险 | 缓解 |
|---|---|
| service role 泄漏 | `admin.ts` 严禁在 client component 引用，eslint 规则阻断 |
| Realtime 连接数上限 | 私信和通知合并到同一 channel；空闲页面 unsubscribe |
| Tiptap JSON schema 演进 | `body_text` 兜底渲染；编辑器版本锁定 |
| RLS 漏写 | 每次新增表强制 `enable row level security` + 至少一条 deny-by-default 检查 |
| 触发器静默失败 | 关键路径（cashtag、score、通知）写迁移自测脚本 |

### 12.1 已知后续工作
- [ ] 行情数据接入（`tickers` 仅元数据）
- [ ] 全文搜索升级到 tsvector（当前 trgm 对中文不友好，建议接入 zhparser 或外部搜索）
- [ ] Email 通知（目前只有 push + 站内）
- [ ] 移动端 PWA 完善（manifest 已就位，离线策略未做）
- [ ] 国际化骨架（保留 `next-themes` 路径但暂不接入 i18n）

---

## 13. 附：分组开发对照

`docs/group-*-integration.md` 是早期多人并行开发时的"接缝备忘"，记录每个 group（A=投票/情绪、B=关注/私信、C=反应/投票、G=管理后台、H=push、K=举报、L/M=补丁）需要在他人文件中插入的最小改动。当前主干已合并完毕，这些文件可作为历史参考保留。
