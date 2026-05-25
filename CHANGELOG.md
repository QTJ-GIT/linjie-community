# 临介社区 变更日志

## 2026-05-26 黄金资讯模块集成 + 帖子删除功能修复

### ✨ 新增功能

#### 黄金资讯实时信息平台
- **新增 `GoldMarketPanel` 组件** — 集成到 `/news` 股市新闻页面下方
  - 四市场行情卡片：黄金期货、白银期货、美元指数、原油期货
  - 模拟价格走势图（30分钟历史）
  - 财经新闻列表，支持国际/国内筛选
  - 价格每30秒自动模拟波动
  - 标注"模拟数据"提示用户
- **数据来源**：基于 `gold_news_package` 项目改造，取消独立 Flask 后端
- **部署适配**：Vercel 国外节点无法访问新浪财经API，改为纯客户端渲染

#### 帖子/评论删除功能（完整审计）
- **作者删除自己的帖子** — `deletePost()` Server Action
- **管理员删除他人帖子** — `softDeletePost()` Server Action
- **删除审计字段**：`deleted_by` (UUID) + `deleted_at` (timestamptz)
- **数据库迁移**：
  - `0020_post_comment_deleted_audit.sql` — 添加审计列
  - `0021_fix_admin_rls.sql` — 修复 RLS 策略
  - `0022_delete_functions.sql` — SECURITY DEFINER 函数（已废弃）

### 🔧 修复

#### 帖子删除 RLS 冲突
- **问题**：`auth.uid()` 在 Server Action 中返回 `null`，导致 RLS 策略始终失败
- **最终方案**：使用 Service Role Key 直接 `.update()`，完全绕过 RLS
- **文件**：`src/lib/supabase/service.ts`、`src/actions/posts.ts`、`src/actions/admin.ts`

#### 黄金资讯 API Route 超时
- **问题**：Vercel 国外节点访问 `hq.sinajs.cn` 超时，导致页面卡住
- **修复**：移除 `/api/gold` Route，改为纯客户端组件，数据内联

### 🏗️ 技术架构变更

| 组件 | 变更 |
|:---|:---|
| `src/actions/posts.ts` | `deletePost()` 改用 Service Role Key |
| `src/actions/admin.ts` | `softDeletePost()` / `softDeleteComment()` / `softDeleteUserContent()` 改用 Service Role Key |
| `src/lib/supabase/service.ts` | 新增 Service Role Client（JWT 格式校验） |
| `src/components/gold/GoldMarketPanel.tsx` | 新增黄金资讯面板（纯客户端） |
| `src/app/(app)/news/page.tsx` | 嵌入 GoldMarketPanel |
| `src/app/(app)/posts/[id]/page.tsx` | 管理员判断改为直接查询 `profiles.is_admin` |
| `src/components/posts/PostDeleteButton.tsx` | 添加删除确认和路由跳转 |

### 🗄️ 数据库迁移

- `0020_post_comment_deleted_audit.sql` — `posts` / `comments` 添加 `deleted_by`, `deleted_at`
- `0021_fix_admin_rls.sql` — `posts update own` WITH CHECK 允许管理员
- `0022_delete_functions.sql` — `delete_post` / `delete_comment` / `admin_delete_user_content` 函数

---

## 更早的更改

### 股市新闻模块
- `/news` 页面 — 新浪财经实时资讯抓取
- `/api/news` + `/api/news/detail` API Route
- 分类筛选、搜索、时间格式化

### SupportWidget 支持组件
- 独立悬浮支持按钮
- 品牌色脉动动画、高 z-index

### 教学资源模块
- `/teaching` 教学大厅
- `/teaching/[id]` 资源详情
- 点赞、评论、分享功能
