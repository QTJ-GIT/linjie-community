# 临介社区 - 部署与运维手册

> 本文档记录了整个项目的部署架构、平台配置和日常更新流程，方便后续维护。

---

## 一、项目概览

| 项目 | 内容 |
|------|------|
| 项目名称 | 临介社区 (linjie-community) |
| 技术栈 | Next.js 14 + React 18 + TypeScript + Supabase |
| 线上地址 | `https://linjie.app`（域名购买后生效） |
| 备用地址 | `https://linjie-community.vercel.app` |

---

## 二、平台架构

```
┌─────────────────────────────────────────────────────────────┐
│                         用户访问层                            │
│              https://linjie.app (自定义域名)                   │
│                      ↓ Cloudflare CDN                        │
├─────────────────────────────────────────────────────────────┤
│                        Vercel 部署层                         │
│              Next.js 应用 (Serverless Functions)              │
│                      ↓ 自动构建/部署                          │
├─────────────────────────────────────────────────────────────┤
│                         数据存储层                            │
│              Supabase (PostgreSQL + Auth + Storage)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、各平台项目映射

### 3.1 GitHub（代码仓库）
- **仓库地址**：https://github.com/QTJ-GIT/linjie-community
- **作用**：主代码仓库，Vercel 自动从此仓库拉取代码部署
- **推送方式**：SSH (`git@github.com:QTJ-GIT/linjie-community.git`)

### 3.2 Vercel（应用托管）
- **项目名**：`qtj-gits-projects/linjie-community`
- **Dashboard**：https://vercel.com/qtj-gits-projects/linjie-community
- **已绑定域名**：`linjie.app`（需完成 DNS 配置）
- **自动部署**：✅ 已开启（GitHub push → 自动构建 → 自动部署）

### 3.3 Supabase（数据库）
- **项目 Ref**：`fexcqswrdiqsihivzntv`
- **Dashboard**：https://supabase.com/dashboard/project/fexcqswrdiqsihivzntv
- **状态**：全部 18 个 migrations 已执行，数据表完整

### 3.4 CNB（国内代码备份）
- **仓库地址**：https://cnb.cool/FRStudio.supine/linjie-community
- **作用**：国内代码备份（目前未配置自动构建）
- **推送方式**：HTTPS (`https://cnb.cool/FRStudio.supine/linjie-community.git`)

---

## 四、环境变量清单

### 4.1 本地开发 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://fexcqswrdiqsihivzntv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZleGNxc3dyZGlxc2loaXZ6bnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzk3MzQsImV4cCI6MjA5NDk1NTczNH0.7XmbnnW3Xt_WO9phII-9b2mafOoXtsha0QeDGjw7E28
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZleGNxc3dyZGlxc2loaXZ6bnR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM3OTczNCwiZXhwIjoyMDk0OTU1NzM0fQ.GIWW9UfZb0o7_wg5stjdUJ0E-eQeyUipg1LRAIdDYVc
ADMIN_INVITE_CODE=FRSTUDIO
```

### 4.2 Vercel 线上环境变量
以下变量已在 Vercel Dashboard 中配置：

| 变量名 | 值 |
|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://fexcqswrdiqsihivzntv.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIs...` |
| `ADMIN_INVITE_CODE` | `FRSTUDIO` |

**查看/修改路径**：Vercel Dashboard → 项目 → Settings → Environment Variables

---

## 五、自动更新流程（核心）

### 5.1 原理
Vercel 已和 GitHub 仓库打通，形成自动 CI/CD 流水线：

```
你在本地修改代码
    ↓
git add . && git commit -m "xxx" && git push origin main
    ↓
GitHub 收到 push
    ↓
Vercel 自动触发构建（约 1-2 分钟）
    ↓
自动部署到生产环境
    ↓
访问 https://linjie.app 即可看到更新
```

### 5.2 日常更新命令（记住这三行）

在项目目录下执行：

```bash
cd D:\临介社区\临介社区

# 1. 添加修改
 git add .

# 2. 提交（写清楚改了什么）
git commit -m "这里写修改说明"

# 3. 推送到 GitHub（Vercel 会自动部署）
git push origin main
```

推送后等 1-2 分钟，刷新 `https://linjie.app` 即可看到更新。

### 5.3 自动同步到 CNB（已配置）

**本地推送**：`git push origin main` 会自动同时推送到 **GitHub + CNB**（已配置双 push URL）

**GitHub Actions 备用同步**：如果本地没推 CNB，GitHub 也会自动同步到 CNB
- 需要在 GitHub Secrets 中配置 `CNB_TOKEN`（可选，本地双 push 已足够）

---

## 六、域名配置（linjie.app）

### 6.1 当前状态
- Vercel 端已添加域名 ✅
- 需要购买的域名：`linjie.app`
- Vercel 要求的 DNS 记录：`A linjie.app 76.76.21.21`

### 6.2 购买后配置步骤
1. 在阿里云/腾讯云/Namecheap 购买 `linjie.app`
2. 进入域名管理后台 → DNS 解析
3. 添加记录：
   - 类型：`A`
   - 主机：`@`（或留空）
   - 记录值：`76.76.21.21`
4. 等待 5-30 分钟生效
5. 访问 `https://linjie.app` 即可

### 6.3 SSL 证书
Vercel 会自动为 `linjie.app` 申请和续期 SSL 证书，无需手动操作。

---

## 七、数据库操作备忘

### 7.1 Supabase 项目信息
- **项目 Ref**：`fexcqswrdiqsihivzntv`
- **已执行的 Migrations**：0016 ~ 0018（教学大厅相关）
- **完整表列表**：profiles, posts, comments, likes, bookmarks, teaching_resources, teaching_likes, teaching_bookmarks, teaching_comments, chat_messages, chat_rooms, tickers 等

### 7.2 执行数据库迁移（自动化脚本）

已配置脚本 `scripts/apply-migrations.js`，可自动执行所有迁移：

```bash
# 1. 确保 .env.local 中有 SUPABASE_ACCESS_TOKEN
# 2. 执行迁移
node scripts/apply-migrations.js
```

**手动执行单条迁移**：
1. 在 `supabase/migrations/` 下新建 SQL 文件（如 `0019_new_feature.sql`）
2. 在 Supabase Dashboard → SQL Editor 中执行
3. 同时在本地 models/types 中同步类型定义

### 7.3 备份数据
- Supabase 自动每日备份，保留 7 天
- 手动备份：Dashboard → Database → Backups

---

## 八、敏感凭证清单（⚠️ 务必保存）

以下凭证已在本项目中使用，请妥善保存：

| 平台 | 凭证 | 用途 |
|------|------|------|
| Supabase | Access Token | `sbp_***`（保存在本地 ~/.cnb/token 中） | Management API |
| Vercel | Token | `vcp_***`（保存在本地，不要泄露） | CLI 部署 |
| CNB | Token | `cnb_at_***`（保存在本地 ~/.cnb/token 中） | CLI 操作 |
| GitHub | SSH Key | `~/.ssh/id_ed25519.pub` | 代码推送 |

**注意**：这些凭证保存在本地文件和环境中，不要泄露给他人。

---

## 九、故障排查

### 9.1 访问 `linjie.app` 打不开
- 检查域名 DNS 是否配置正确（A 记录 → `76.76.21.21`）
- 检查 Vercel Dashboard 中域名状态

### 9.2 部署失败
- 查看 Vercel Dashboard → Deployments → 点击失败的部署查看日志
- 常见原因：环境变量缺失、构建报错、类型检查失败

### 9.3 数据库表不存在
- 登录 Supabase Dashboard → Table Editor 检查表是否存在
- 如缺失，执行对应 migration SQL

### 9.4 本地开发报错
- 删除 `.next` 缓存：`rm -rf .next`
- 重新安装依赖：`rm -rf node_modules && npm install`
- 重启 dev server：`npm run dev`

---

## 十、联系方式

如需更新或遇到问题，请提供以下信息以便快速定位：
1. 你修改了什么？
2. 报错信息是什么？
3. 哪个页面/功能出问题？
