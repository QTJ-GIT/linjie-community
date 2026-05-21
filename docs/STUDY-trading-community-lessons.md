# STUDY · 交易社区项目经验萃取

> 来源：外部《交易社区项目经验总结》（同栈 Next.js + Supabase）。
> 目的：只提取**临介社区还没做或做错**的部分；与已有 docs（MOTION-RECIPES、WEB-DESIGN-PRINCIPLES、UPGRADE-ROADMAP、SUPABASE-CHANGELOG、CHANGELOG-redesign）不重复。

## 摘要

七节里的水位（已做过 / 值得学 / 不适用）：**5 / 1 / 1**。
临介社区在 Supabase 权限分层、RLS 模板化、SQL 幂等、secrets 管理上都已合规；视觉/动画体系比原文更深一层；**真正的差距集中在两处**——
1. **PostBody.tsx 渲染 Tiptap link mark 时未校验 `href` scheme**，理论上允许 `javascript:` URI（XSS 真问题）。
2. **PostCard / CommentTree / FeedList 已超 200 行行数预警**（304 / 323 / 234），按原文 6.3 应触发拆分。
其余多为已做过或不适用（部署在 Vercel 而非 Cloudflare，UI 走亮色 + glass，不是深色）。

---

## 一、项目概述（栈与结构）

- **原文要点**：Next.js 14 + Supabase + Cloudflare Pages，深色 UI；前后端分离 `web/` + `server/`。
- **现状**：见 `package.json`：Next 14.2.15 + `@supabase/ssr` 0.10 + Tailwind + shadcn/Radix；**单仓 Next App Router**，无独立 server，部署目标是 Vercel（见 `.gitignore:32` 的 `.vercel`）。配色走亮色 + glass，不是深色。
- **差异**：**不适用**。Cloudflare Workers 后端、深色主题这两条与临介社区路线不一致。
- **落地建议**：无。

## 二、Supabase 数据库

- **原文要点**：anon vs service_role 严格分层；RLS 默认禁止；SQL 必须可重跑。
- **现状**：
  - 分层：`src/lib/supabase/client.ts` 仅注入 `NEXT_PUBLIC_SUPABASE_ANON_KEY`；`src/lib/supabase/admin.ts:1` 顶上 `import 'server-only'` + `SUPABASE_SERVICE_ROLE_KEY`，且 `Grep service_role` 全仓只在 admin.ts 出现一次——已合规。
  - 0001-0013 SQL 去重符合度逐条评分（再跑安全 = ✅）：
    - 0001_init_schema：`create extension if not exists` / `create table if not exists` / `insert ... on conflict do nothing`——✅
    - 0002_rls_policies：每条 policy 都 `drop policy if exists ... ; create policy`——✅
    - 0003_functions_triggers：`create or replace function` / `drop trigger if exists`——✅
    - 0004_seed_tickers：seed 是否带 `on conflict (symbol) do nothing` 需复核（仅看了头部）——⚠️ **需确认**
    - 0005_storage：`insert into storage.buckets ... on conflict do nothing` + `drop policy if exists`——✅
    - 0006_votes_sentiment_karma：`add column if not exists` + `do $$ ... duplicate_object` + `create or replace`——✅
    - 0007_follows_dm：全 `if not exists` / `drop policy if exists` / `do $$ pg_publication_tables` 守护——✅
    - 0008_reactions_polls：同上——✅
    - 0009_admin_reports：`add column if not exists` + `do $$ create type ... duplicate_object`——✅
    - 0010_push_subscriptions：标准模板——✅（已被 0013 撤回）
    - 0011_comments_path：含 `do $$ if exists ... limit 1` 守护的一次性 backfill——✅
    - 0012_profiles_last_seen：`add column if not exists` + `create or replace view`——✅
    - 0013_drop_push_subscriptions：`drop policy if exists` + `drop table if exists`——✅
- **差异**：**已做过**（仅 0004 头部未读完，建议本次顺手核对一次 seed 的 `on conflict`）。
- **落地建议**：复核 `supabase/migrations/0004_seed_tickers.sql` 末尾每个 `insert into public.tickers` 是否都带 `on conflict (symbol) do nothing`；其它无须改动。

## 三、前端开发

- **原文要点**：单文件 200-400 行；样式隔离；**opacity + animation 同时设会失效**；响应式。
- **现状**：
  - 单文件行数（`src/components/posts/`）：`PostCard.tsx` 308、`CommentTree.tsx` 323、`FeedList.tsx` 234、`PostComments.tsx` 189、`PostForm.tsx` 204、`VoteButtons.tsx` 174。**PostCard / CommentTree 已踩到原文 200-400 上沿、且 CommentTree 接近 400**。
  - 动画安全核查：
    - `BlurFade.tsx:32` 用 `motion.div initial={{opacity:0,...}} animate={{opacity:1,...}}`——framer-motion 自动接管 opacity，**不会**出现「Tailwind 静态 `opacity-0` 与 keyframe 同时设」的冲突，**安全**。
    - `UnreadStripe.tsx:36` 全静态 className，无动画，**安全**。
    - `VoteButtons.tsx:107` `AnimatePresence` 包裹的 `motion.span` 用 `initial.opacity:0.6 → animate.opacity:0 → exit.opacity:0`，由 motion 单一来源控制——**安全**。
  - 数据获取：`from().select(... join ...)` 模式与原文一致（详见已有 `docs/SUPABASE-CHANGELOG.md`）。
- **差异**：**值得学（拆文件）** + 动画安全已做过。
- **落地建议**：
  - `src/components/posts/CommentTree.tsx`（323 行）拆出折叠/色环/缩进辅助到 `src/components/posts/comment-tree/` 子目录（如 `CollapseToggle.tsx`、`DepthRing.tsx`、`useCollapseState.ts`）。
  - `src/components/posts/PostCard.tsx`（308 行）将「meta 行 / action 行 / body 渲染」三段拆成同目录 `PostCardMeta.tsx`、`PostCardActions.tsx`，主文件控在 ≤180 行。

## 四、安全

- **原文要点**：DOMPurify 转义 user input；RLS 检查清单。
- **现状**：
  - **真问题**：`src/components/posts/PostBody.tsx:142-153` 渲染 Tiptap `link` mark 时直接 `href={String(mark.attrs.href ?? '#')}`，**未校验 scheme**。攻击者构造 `{type:'text',marks:[{type:'link',attrs:{href:'javascript:alert(1)'}}]}` 经 server action 写入即可触发。Tiptap 自带的 sanitize 在 server action 落库前并未启用——这是已知 Tiptap 默认行为坑。
  - 输入侧：临介社区不走 markdown 拼接，直接序列化 Tiptap JSON；body 经 supabase-js 参数化写入，**SQL 注入面闭合**。无 `dangerouslySetInnerHTML` 全仓 0 处（`Grep dangerouslySetInnerHTML|DOMPurify|sanitize` = 0 命中）——所以无须引入 DOMPurify。
  - RLS 四态覆盖核查：
    - 0002 profiles/posts/comments/likes/bookmarks/notifications：select+insert+update+delete 齐全。
    - 0007 dm_threads：缺 `update`/`delete`（设计上 thread 不可改名 / 不删除，**可接受**）；dm_messages：select+insert+update（mark read），缺 delete（**有意，DM 不可删，业务设计**）。
    - 0008 reactions：select+insert+delete，缺 update（reactions 不需要 update，**合理**）；polls/poll_options：`for all`（覆盖四态），合规；poll_votes：select+insert+delete（投票不 update，撤销=delete，**合理**）。
    - 0009 reports：insert（用户）+ select/update（admin），无 delete（保留审计，**合理**）；并补了 `posts admin update` / `comments admin update`，覆盖管理员软删路径。
    - 0011/0012：无新表，仅加列与触发器/视图，沿用已有 RLS。
- **差异**：DOMPurify 不需要（Tiptap JSON + 自渲染白名单）；**link href 校验是真差距**。
- **落地建议**（高优先级，安全级）：
  - `src/components/posts/PostBody.tsx:142` 在使用 `href` 前加白名单校验，仅放行 `http: / https: / mailto:`，否则降级为纯文本或 `#`：
    ```ts
    const raw = String((mark.attrs as { href?: string } | undefined)?.href ?? '');
    const safe = /^(https?:|mailto:)/i.test(raw) ? raw : '#';
    ```
    并对 `case 'image'` 的 `src`（`PostBody.tsx:88`）做同样的 `^(https?:|data:image\/)` 校验，避免 `javascript:` 走图片 src。

## 五、调试与排错

- **原文要点**：PGRST204 / 42501 / 23505 三大错误码识别；SQL Editor / Network / Console 三件套。
- **现状**：临介社区 server actions 已统一返回 `{ ok, error }`（见 `src/actions/*` 调用端），但**没有把 PGRST/42501/23505 映射成中文 toast**——目前用户看到的多是英文原始报错。
- **差异**：**值得学（小）**。
- **落地建议**：在 `src/lib/utils.ts` 末尾追加 `mapSupabaseError(err)` 工具，把这三个 code 映射为「内容已过期请刷新 / 没有权限 / 重复操作」并在 `actions/comments.ts`、`actions/votes.ts`、`actions/posts.ts` 的 catch 分支统一调用。属低风险增量。

## 六、工作流程

- **原文要点**：备份 → SQL Editor 测试 → IF NOT EXISTS → 验证；前端小步迭代 + lint/typecheck；单文件 ≤500 行。
- **现状**：`docs/SUPABASE-CHANGELOG.md` 已落实迁移流程；`package.json` 有 `lint`，无 `typecheck` 单独脚本（next build 隐含 tsc）。单文件最大 `CommentTree.tsx:323`，未越 500 红线，但已越 400 黄线（与第三节呼应）。
- **差异**：**已做过**。无须新增。

## 七、经验清单（"永远不要"四条对账）

| # | 原文条款 | 临介现状 | 结论 |
|---|---|---|---|
| 1 | 前端暴露 service_role | `Grep` 全仓 service_role 仅 `admin.ts:7`，且文件首行 `import 'server-only'` | ✅ 已做到 |
| 2 | 忘 IF NOT EXISTS | 0001-0013 全部带幂等守护（见第二节评分） | ✅ 已做到 |
| 3 | 忽略 RLS 测试 | 0002 模板 + 0006-0013 每张新表都启 RLS（见第四节） | ✅ 已做到 |
| 4 | 提交含 secret 的代码 | `.gitignore:29` 覆盖 `.env*.local`；`.env.local` 存在但不会被提交；`.env.example` 是占位 | ✅ 已做到 |

四条全数达标，无需调整。

---

## 立即可改 / 中期改 / 不适用 / 已做过

**立即可改（高优先级，安全 / 数据完整性）**
1. `src/components/posts/PostBody.tsx:88,142` 给 image `src` 与 link `href` 加 scheme 白名单（防 `javascript:` 注入）。**真 XSS 缺口**。
2. `supabase/migrations/0004_seed_tickers.sql` 复核每条 `insert` 是否带 `on conflict (symbol) do nothing`（本次研究只读了头部 10 行）。

**中期改**
3. `src/components/posts/CommentTree.tsx`（323 行）按业务子域拆分到 `comment-tree/` 子目录。
4. `src/components/posts/PostCard.tsx`（308 行）拆 meta / action / body 三块。
5. `src/lib/utils.ts` 新增 `mapSupabaseError`，覆盖 PGRST204 / 42501 / 23505。

**不适用**
- Cloudflare Workers / Pages 路线（临介走 Vercel + Supabase）。
- 深色主题专项（临介走亮色 + glass，已有 `WEB-DESIGN-PRINCIPLES.md` / `CHANGELOG-redesign.md` 体系）。
- DOMPurify 引入（无 `dangerouslySetInnerHTML`，Tiptap 自渲染走白名单 switch；只需补 href/src scheme 校验，不需新依赖）。

**已做过（不再赘述）**
- Supabase 三层 client（client / server / admin）+ middleware 会话刷新。
- RLS 模板化、四态策略覆盖（含 admin 旁路、DM 参与方约束、polls 作者写）。
- 0001-0013 SQL 全幂等。
- secrets 隔离 + `.gitignore` 收口。
- 动画路径无 opacity/keyframe 冲突（framer-motion 单源控制）。
