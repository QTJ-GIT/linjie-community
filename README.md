# 临介社区

一个 Next.js 14 + Supabase 社区，支持发帖讨论、Q&A、股票话题、实时聊天、注册登录、通知、点赞收藏。

## 技术栈
- Next.js 14 (App Router, Server Components, Server Actions) + TypeScript
- Supabase Cloud（Postgres + Auth + Realtime）
- Tailwind CSS + shadcn/ui
- Tiptap 富文本编辑器
- react-hook-form + zod

## 首次运行

### 1. 配置 Supabase
见 [`supabase/README.md`](./supabase/README.md)，包含：
- 创建 Supabase 项目
- 复制三个密钥
- 在 SQL Editor 依次运行 4 个迁移（`supabase/migrations/0001`~`0004`）
- 启用邮箱登录与重定向 URL

### 2. 配置环境变量
复制 `.env.example` 为 `.env.local`，填入 Supabase 三个密钥：
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. 启动
```bash
npm run dev
```

打开 http://localhost:3000

## 目录结构
- `src/app/(auth)` — 登录/注册/回调
- `src/app/(app)` — 主应用：feed / 分区 / 帖子 / ticker / 聊天室 / 通知 / 收藏 / 个人资料
- `src/components/ui` — shadcn/ui 组件
- `src/components/{editor,posts,chat,notifications,tickers,shell}` — 功能组件
- `src/lib/supabase/` — 客户端 / 服务端 / middleware / admin 四种 Supabase 连接
- `src/lib/{cashtags,tiptap-to-text,utils}.ts` — 工具函数
- `src/lib/validators/` — zod schema
- `src/actions/` — server actions
- `src/hooks/` — React hooks（Realtime 订阅等）
- `src/types/` — 类型
- `supabase/migrations/` — SQL 迁移（手动粘贴到 Supabase SQL Editor）

## 数据模型
核心表：`profiles` / `posts` / `comments` / `likes` / `bookmarks` / `tickers` / `post_tickers` / `chat_rooms` / `chat_messages` / `notifications`。详见 `supabase/migrations/0001_init_schema.sql`。

## 股票话题（Cashtag）
- 正则 `\$([A-Z]{1,5}|[0-9]{6})` 同时在 Postgres 触发器与前端 `src/lib/cashtags.ts` 里实现
- 帖子写入时，触发器自动把匹配到的、存在于 `tickers` 表中的符号写入 `post_tickers`
- `/tickers/[symbol]` 话题页显示该股票下所有帖子 + 专属聊天室

## Realtime
`chat_messages` / `notifications` / `comments` 加入 `supabase_realtime` publication，客户端通过 `postgres_changes` 订阅。

## 构建校验
```bash
npm run lint
npm run build
```
