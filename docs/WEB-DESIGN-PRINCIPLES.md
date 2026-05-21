# 静态设计原则手册

面向临介社区（Next.js 14 + Tailwind + shadcn）的**静态视觉语言**指南。
动效（framer-motion / CSS transition / FLIP）请看 `docs/MOTION-RECIPES.md`，本文不涉及。
路线图与功能拆条请看 `docs/UPGRADE-ROADMAP.md`。

每节固定三段：**原理 → 可粘贴示例 → 临介社区落地点**。

---

## 1. 中英文混排排版

**原理**：中文是方块字、英文是比例字母，行高需要更松（≥1.6），数字/handle/股票代号必须等宽避免列跳动；中英文之间留 ¼em 空气最舒服，CSS `text-spacing-trim` 由浏览器自动收紧引号/标点的边距。

**示例**

```css
/* globals.css 追加：中文阅读流 */
:root { --leading-cn: 1.75; }
.text-cn { line-height: var(--leading-cn); text-spacing-trim: trim-start; }

/* 数字 / 时间戳 / 票代统一 mono + tabular-nums，避免列宽抖动 */
.num-stable { font-feature-settings: 'tnum' 1, 'cv11' 1; font-variant-numeric: tabular-nums; }
```

```tsx
// 帖子正文段落
<p className="text-cn text-[15px] text-foreground/90">
  今天 AAPL 涨 3.2%，看多。
</p>
// 时间戳 / @handle / 票代
<span className="font-mono num-stable text-[11px]">3 分钟前</span>
```

**临介社区落地点**
- `tailwind.config.ts` `fontSize.body` 行高目前 `1.6`，正文 `prose-post` 已经是 `1.8`（合适），但卡片摘要 `text-[0.9375rem] leading-relaxed`（`PostCard.tsx:132`）只有 `1.625`，可统一抬到 `leading-[1.75]`。
- `SmartTime`、`PostCardHeader` 已对时间用 `font-mono`（`PostCard.tsx:83-85`），但 `comment_count`（`PostCard.tsx:172`）只加了 `tabular-nums` 没启 `font-feature-settings: 'tnum'`，长列表里 1 vs 11 仍可能错位。
- `globals.css` 已设置 `font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11'`（`globals.css:115`），可补一行全局 `text-spacing-trim: space-first;`（渐进增强，旧浏览器忽略）。

---

## 2. 颜色系统 + 暗色模式

**原理**：HSL 把"亮度/饱和度"独立出来，便于派生 hover/disabled/ring；shadcn 把 token 解耦成 `--background` / `--foreground` 两层语义，组件只引语义、不引色值。中国市场金融语境**红涨绿跌**与硅谷绿涨红跌相反，必须用业务 token 隔离，不能直接复用 `text-emerald-500` 当"涨"。颜色不是唯一信息载体——sentiment 必须文字 + 颜色双轨。

**示例**

```css
/* 业务语义 token，与 brand 解耦 */
:root {
  --bull: 0 78% 52%;     /* 中国市场：红 = 涨 */
  --bear: 145 55% 42%;   /* 中国市场：绿 = 跌 */
  --neutral: 240 5% 50%;
}
.dark { --bull: 0 78% 62%; --bear: 145 50% 50%; }
```

```tsx
// 业务侧引语义，不直接用 emerald/rose
<span style={{ color: 'hsl(var(--bull))' }}>+3.20%</span>
<SentimentBadge sentiment="bull" /> {/* 文字"看多" + 红底 */}
```

**对比度基线**：正文 ≥ 4.5:1（WCAG AA），大标题 ≥ 3:1，禁用文字至少 3:1（不要 `text-muted-foreground/40`）。

**临介社区落地点**
- `SentimentBadge.tsx:13-19` 当前 `bull: emerald / bear: rose` 是**美式**配色。如果定位 A 股社区，必须翻转；定位港美股 / 加密则保持现状但要在产品定位文档里明示一次。建议抽出 `--bull/--bear` token，让全站（涨跌幅、K 线、热度）一致引用。
- `PostCard.tsx:147-148` 票代 chip 也用 emerald 系，与 `SentimentBadge` 的"看多 = emerald"撞色，未来如果翻转 sentiment 还要分开处理。
- `globals.css` 已有完整 brand 阶 + 暗色翻转，是好范本；`secondary/muted/accent` 都用 `240 5%` 的偏冷灰，与 indigo 同色相，整体冷调一致。

---

## 3. 间距与栅格

**原理**：Tailwind 默认 4px base（`p-1 = 0.25rem`），8px 网格更稳但 4px 更灵活，关键是**同一面板里只用一套节奏**。中文阅读宽度的舒适区是每行 30–40 个汉字（约 540–720px），`max-w-2xl` (672px) 在范围内偏紧凑。容器查询 `@container` 让组件按父容器响应，比 viewport `@media` 更适合可复用卡片。

**示例**

```tsx
// 双栏 shell 的容器查询
<aside className="@container">
  <div className="grid gap-3 @sm:grid-cols-2 @lg:grid-cols-1">
    {/* sidebar 收窄时 2 列，宽时 1 列 */}
  </div>
</aside>
```

```css
/* tailwind.config.ts 可选扩展：8 倍数语义 */
spacing: {
  'gutter': '1.5rem',     /* 24px 卡片内边距 */
  'gutter-lg': '2rem',    /* 32px 段间距 */
}
```

**临介社区落地点**
- `src/app/(app)/feed/page.tsx:44` 现 `max-w-2xl`（672px）单栏。Day 12+ 若要做双栏 shell，建议 `lg:grid lg:grid-cols-[680px_320px]`，主栏定宽不被边栏挤压。
- `PostCard.tsx:274` `px-5 py-5` (20px) 与 `PostListSkeleton.tsx:36` 一致，OK；但 `compact` 模式 `px-4 py-3`（`PostCard.tsx:205`）和 card 模式不在同一节奏（4 vs 5），建议二选一统一为 4 或 5。
- 容器查询尚未启用：Tailwind 自带 `@tailwindcss/container-queries` 插件未安装。**不建议主动引入**，先用 viewport 断点把双栏做出来再说。

---

## 4. 信息密度 / 数据展示

**原理**：卡片适合**异构条目**（标题 + 摘要 + meta 不同长度），列表适合**同构条目**（聊天消息），表格适合**可比对数值**（行情、排行榜）。金融场景靠 mono 数字、右对齐、`min-width` 防跳锁住"专业感"；长列表给宽度阵列错落，比统一灰条更接近真实节奏。

**示例**

```tsx
// 涨跌幅列：mono + tnum + 右对齐 + min-width
<td className="text-right font-mono tabular-nums min-w-[5ch]">
  {value >= 0 ? '+' : ''}{value.toFixed(2)}%
</td>

// 评论计数防跳：固定字符数槽位
<span className="font-mono tabular-nums inline-block min-w-[2ch] text-right">
  {count}
</span>
```

**临介社区落地点**
- `PostCard.tsx` 已实现 `card / compact` 双模 + `FeedViewToggle`（Day 6 完成），是密度切换的好范例。
- `PostListSkeleton.tsx:11-17` 用 `TITLE_WIDTHS / SUMMARY_WIDTHS / META_WIDTHS` 三组阵列错落（`w-3/4`/`w-2/3`/`w-4/5`…），可作为新建任何长列表骨架的模板。
- `PostCard.tsx:172` `comment_count` 当前没有 `min-w-[2ch]`，从 9 → 10 时整行会左推 1px。建议加 `inline-block min-w-[2ch] text-right`。
- 未来若上行情表（`/tickers/[symbol]` 详情页），主体应是 `<table>` + `tabular-nums`，不要拿卡片堆。

---

## 5. 表单与输入

**原理**：placeholder 不是 label —— 输入后消失会让有视障辅助 / 中途分心的用户失去字段含义。错误态需要 **颜色 + 图标 + 文字** 三件套（不能只靠红色，色弱用户读不出来）。提交按钮要走 **idle → pending → success → error** 四态，pending 必须 `disabled` 防双击。`:focus-visible` 只在键盘聚焦时显示 ring，鼠标点击不显示，比 `:focus` 干净。

**示例**

```tsx
import { AlertCircle } from 'lucide-react';

<div className="space-y-1.5">
  <label htmlFor="title" className="text-sm font-medium">标题</label>
  <input
    id="title"
    aria-invalid={!!error}
    aria-describedby={error ? 'title-err' : undefined}
    className="w-full rounded-md border bg-background px-3 py-2
               focus-visible:outline-none focus-visible:ring-2
               focus-visible:ring-[hsl(var(--brand-500))]/50
               aria-[invalid=true]:border-destructive"
  />
  {error && (
    <p id="title-err" className="flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3.5 w-3.5" aria-hidden />
      {error}
    </p>
  )}
</div>
```

**临介社区落地点**
- `CommentForm.tsx:62-82` 简洁但缺 `<label>`，`Textarea` 仅靠 placeholder "写下你的评论…" 表达字段含义。建议加视觉隐藏 label：`<label className="sr-only" htmlFor="...">评论内容</label>`。
- `CommentForm.tsx:76` 提交按钮已有 `pending` 二态 + spinner，OK；但失败只 `toast.error(res.error)`，按钮直接回 idle，用户可能没注意到。可考虑 2 秒内按钮文字变"重试"。
- `ChatRoom.tsx` 输入框（`MAX_LEN = 2000`）当前没有字符计数提示，临近上限时建议 `<span aria-live="polite">{draft.length}/2000</span>`。

---

## 6. 加载 / 空 / 错误 三态

**原理**：Skeleton 用于**已知形状**的内容（feed、评论树），让用户预期布局；spinner 用于**形状未知**或**短时间**操作（按钮提交）；progress bar 用于**可知进度**（上传）。空状态分两种：**首屏空**（"还没有人发帖，来开第一帖"）需要鼓励行动；**搜索/筛选无结果**（"没有匹配 X 的内容"）需要降低预期 + 提供退路。错误态必须给出至少一条恢复路径，不能只丢一个 sad face。

**示例**

```tsx
// 错误恢复三段式
<div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
  <div className="flex items-center gap-2 text-destructive">
    <AlertCircle className="h-4 w-4" aria-hidden />
    <span className="font-medium">加载失败</span>
  </div>
  <p className="mt-1 text-sm text-muted-foreground">网络异常，请检查后重试。</p>
  <div className="mt-3 flex gap-2">
    <Button size="sm" onClick={retry}>重试</Button>
    <Button size="sm" variant="ghost" asChild><Link href="/">返回首页</Link></Button>
  </div>
</div>
```

**临介社区落地点**
- `EmptyState`（`empty-state.tsx`）已具复合 API（icon/title/description/action）+ brand 渐变光晕，质量高。要补的是**两种空文案模板**：首屏空 vs 搜索空，可加 `variant?: 'first-run' | 'no-results'` prop，预设两套默认 icon/copy。
- `PostListSkeleton.tsx` 已有错落阵列；评论树（`CommentTree.tsx`）目前没有专属 skeleton，长楼层加载会"砰"一下出现，可仿制一份。
- `app/(app)` 下各路由的 `error.tsx` 是否都有 `reset()` 重试按钮值得抽查，避免只渲染静态错误文案。

---

## 7. 可访问性

**原理**：WCAG 2.1 AA 是国内出海产品的事实底线。三件最常被忘的事：(1) `prefers-reduced-motion` 必须真正关掉非必要动画，不能只把时长除二；(2) Tab 顺序必须等于视觉阅读顺序；(3) 颜色不能是**唯一**信息载体——红绿色弱占男性 8%，sentiment 必须文字 + 色彩双轨。语义标签 `<nav>/<article>/<main>/<aside>` 让屏幕阅读器自动生成跳转目录。

**示例**

```css
/* 全局兜底：尊重系统降噪偏好 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

```tsx
// 图标按钮必须有 aria-label
<button aria-label="点赞" onClick={vote}>
  <ThumbsUp aria-hidden className="h-4 w-4" />
</button>
```

**临介社区落地点**
- `useReducedMotion`（`useReducedMotion.ts`）已封装；建议在 `globals.css` 再加一段全局 `@media (prefers-reduced-motion: reduce)` 兜底，覆盖那些用纯 CSS `animate-*` 的角落（如 `Loader2` 旋转）。
- `SentimentBadge.tsx` 已是文字 + 颜色双轨（`bull: '看多'`），是颜色不作为唯一载体的好示范；`UnreadStripe`（左缘色条）目前**只有颜色**，可考虑加 `aria-label="未读"` 或 sr-only 文字。
- `PostCard.tsx:174-177` 的 `ReportButton` / `ShareMenu` 等图标按钮，需要核对每个内部 trigger 是否都有 `aria-label`（lucide icon 自身只是 svg，没有标签）。

---

## 落地清单

### 立即可改（30 分钟内，低风险）
1. `PostCard.tsx:172` 评论计数加 `inline-block min-w-[2ch] text-right`，防长列表抖动。
2. `globals.css` 加 `@media (prefers-reduced-motion: reduce)` 全局动画兜底。
3. `CommentForm.tsx:64` 加 `<label className="sr-only">` 提升表单 a11y。
4. `UnreadStripe` 加 sr-only 文字"未读"，颜色不再是唯一载体。

### 中期改（1–2 天，需要协调）
5. 抽 `--bull / --bear / --neutral` 业务 token 进 `globals.css`，让 `SentimentBadge` 与未来涨跌幅、K 线统一引用，并在产品定位文档里钉死红涨/绿涨方向。
6. `EmptyState` 加 `variant?: 'first-run' | 'no-results'`，分化两类空文案。
7. `CommentTree` 配套骨架组件，与现有 `PostListSkeleton` 对齐节奏。

### 长期目标（架构级）
8. 统一中文行高 token（`--leading-cn`），让 prose / 卡片摘要 / 评论正文用同一节奏。
9. 双栏 shell 落地后再评估容器查询插件，不要先于布局抽象。
10. 全站表单提交按钮收敛为四态（idle/pending/success/error）的统一 `<SubmitButton>` 组件。

### 与后台 UI 重设计代理的分工
- **本文档 _不_ 直接驱动改动**；后台代理在改各页面（feed / posts / chat shell）时，**自然会触达**清单 #5（`SentimentBadge` 配色）、#6（`EmptyState` 分化）、#9（双栏 shell）。这三条**留给后台代理**，避免覆盖。
- 主代理后续可以放心动 #1 / #2 / #3 / #4 —— 都是孤立小文件，与重设计 PR 冲突面小。
