# Group K 集成备忘（管理后台 / 举报 / 置顶）

## 1. 数据库迁移

运行 `supabase/migrations/0009_admin_reports.sql`。包含：

- `profiles.is_admin bool default false`
- `posts.is_pinned bool default false`
- `reports` 表（target_type ∈ post / comment / chat_message / user）
- RPC `public.is_admin()` → bool
- 视图 `public.report_pending_count`
- RLS：举报由登录用户 insert，仅管理员可 select / update；帖子与评论增加管理员 override update 策略。

## 2. 引导第一个管理员

迁移后默认没有任何管理员。用户需要在 Supabase SQL 编辑器手动设置：

```sql
update public.profiles set is_admin = true where handle = 'your_handle';
```

之后该账号登录，侧栏会自动出现「管理后台」入口，并可访问 `/admin`。

## 3. 新增路由

| 路由 | 说明 |
| --- | --- |
| `/admin` | 总览：待处理举报 / 用户总数 / 近 7 天新帖 |
| `/admin/reports` | 举报队列（pending / resolved / dismissed / all） |
| `/admin/users` | 用户列表（按声望排序，50 / 页） |
| `/admin/users/[handle]` | 用户详情，切换管理员身份 |
| `/admin/posts` | 近 50 篇帖子，置顶 / 软删除 |

`(app)/admin/layout.tsx` 在服务端通过 RPC `is_admin()` 校验；非管理员 `redirect('/')`。

## 4. 举报入口

已接入：

- `PostCard.tsx`：action row 中 ShareMenu 左侧
- `CommentTree.tsx`：回复按钮右侧（仅登录且评论未删除显示）

如需给聊天消息/用户 profile 加举报，直接使用：

```tsx
import { ReportButton } from '@/components/reports/ReportButton';
<ReportButton targetType="chat_message" targetId={msg.id} />
<ReportButton targetType="user" targetId={profile.id} />
```

`targetType` 合法值：`'post' | 'comment' | 'chat_message' | 'user'`。

## 5. 服务端 Action

- `src/actions/reports.ts` → `reportContent({ target_type, target_id, reason })`
- `src/actions/admin.ts` → `resolveReport / pinPost / softDeletePost / softDeleteComment / toggleUserAdmin`

所有 admin action 在写入前通过 RPC `is_admin()` 二次校验。

## 6. 侧栏

`src/components/shell/Sidebar.tsx` 在客户端 mount 时通过浏览器 Supabase client 查 `profiles.is_admin`。非管理员不会看到「管理后台」入口，避免与 `(app)/layout.tsx` 的其它改动冲突。

## 7. 置顶显示

`PostCard` 已读取 `post.is_pinned` 并显示 📌 置顶徽标。`PostWithAuthor` 类型新增可选字段 `is_pinned?: boolean`。如需 feed 把置顶帖排到最前，可在 `src/actions/feed.ts` 的 order 中增加 `order('is_pinned', { ascending: false })`（当前未改动，保持最小入侵）。
