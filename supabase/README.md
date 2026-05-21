# Supabase 配置指南

## 1. 创建项目
1. 登录 https://supabase.com/dashboard
2. **New project** → 选地域（越近越好，影响 Realtime 延迟）→ 等待约 2 分钟

## 2. 拷贝密钥
进入项目 → **Project Settings → API**，复制：

| 项 | 填到 `.env.local` 的变量 |
|---|---|
| `Project URL` | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role`（**绝不可暴露给浏览器**） | `SUPABASE_SERVICE_ROLE_KEY` |

## 3. 运行迁移
左侧导航 → **SQL Editor** → 新建 query，依次复制粘贴以下文件内容并执行：

1. `0001_init_schema.sql`
2. `0002_rls_policies.sql`
3. `0003_functions_triggers.sql`
4. `0004_seed_tickers.sql`
5. `0005_storage.sql` — 创建 `avatars` 和 `post-images` 两个公开存储桶及其 RLS 策略（头像上传、帖子配图必需）

每个跑成功后再跑下一个。重复运行安全（使用 `if not exists` / `drop policy if exists` 等）。

> 说明：`0005_storage.sql` 通过 SQL 直接创建 Storage bucket 和 RLS 策略，**无需**在 Dashboard 上点击建桶。在 SQL Editor 粘贴并执行即可。

## 4. 启用邮箱登录
**Authentication → Providers → Email** → Enable

开发期建议把 "Confirm email" 关闭（否则注册后要点邮箱链接才能登录）。

## 5. 配置重定向 URL
**Authentication → URL Configuration**：
- Site URL: `http://localhost:3000`
- Redirect URLs 新增：`http://localhost:3000/callback`

## 6. 确认 Realtime publication
**Database → Replication** → 确认 `supabase_realtime` 这条发布里包含：
- `chat_messages`
- `notifications`
- `comments`

0003 脚本已尝试自动添加。若未出现，去该页面手动勾选。

## 7. 跑起来
回到项目根，`npm run dev`，访问 http://localhost:3000
