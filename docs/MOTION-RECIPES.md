# 动效配方手册

面向临介社区（Next.js 14 + framer-motion v12 + Tailwind + next-themes）的可粘贴落地配方。
每节四段：**概念 → 核心代码 → 临介社区落地点 → 坑/性能/a11y**。

---

## 1. Framer Motion layout 动画（自动 FLIP）

**概念一句话**：给 `<motion.div layout>` 加 `layout` prop，运行时 framer-motion 用 FLIP（First-Last-Invert-Play）量出元素新旧位置/尺寸的差，用 `transform` 反向补偿后再播放，因此**布局变化也能 60fps**。

**核心代码**

```tsx
'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export function CollapsibleThread({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div layout className="rounded-lg border p-3">
      <button onClick={() => setOpen((v) => !v)} className="text-sm">
        {open ? '收起' : '展开'}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            layout
            key="body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

**临介社区落地点**
- `src/components/posts/CommentTree.tsx`：折叠/展开子树时父节点加 `layout`，子树容器用 `AnimatePresence + layout + height auto`，避免硬切。
- `src/components/posts/FeedList.tsx` + `FeedViewToggle.tsx`：`card ↔ compact` 视图切换时给 `<motion.li layout>`，让卡片高度过渡。
- `src/components/posts/PostComments.tsx`：新评论插入时父 `<ul layout>`，让现有评论"挪位"而不是闪现。

**坑/性能/a11y**
- `layout` 用 `transform` 模拟尺寸变化，**`border-radius`、`box-shadow` 会被拉伸**。如果卡片有圆角，加 `style={{ borderRadius: 12 }}` 让 framer-motion 知道并补偿；或仅用 `layout="position"`（只动位置，不动尺寸）。
- 列表里**每一个**子项都加 `layout` 时成本不低；千行级列表请配合 `react-virtual` 或只给 mount/unmount 边界加。
- 父节点也要加 `layout`，否则子节点测得的 viewport 偏移会错位。

---

## 2. AnimatePresence 进出场

**概念一句话**：`AnimatePresence` 监听其子节点的 mount/unmount，**延迟卸载**直到 `exit` 动画完成；每个直接子节点必须有稳定的 `key`。

**三种 mode 区别**
- `wait`：旧的先完全 exit，新的再 enter。**适合 modal/页面切换**。
- `sync`（默认）：进出同时进行。
- `popLayout`：被移除的元素立即"脱离布局"（绝对定位），其他兄弟立刻重排，常配合 `layout` 使用。**适合列表中删一项不希望其他项等待**。

**核心代码（带 layoutId 的"魔法移动"）**

```tsx
'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export function MagicModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <motion.button layoutId="card-1" onClick={() => setOpen(true)}>
        打开
      </motion.button>
      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            layoutId="card-1"
            className="fixed inset-10 rounded-2xl bg-card p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button onClick={() => setOpen(false)}>关闭</button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

**临介社区落地点**
- `src/app/(app)/notifications/page.tsx`：通知项删除用 `popLayout` + `exit={{ opacity: 0, x: 30 }}`。
- `src/components/posts/CommentForm.tsx`：回复表单展开/收起 → `mode="wait"` + `initial/animate/exit` 高度淡入。
- `src/app/(app)/messages/[threadId]/page.tsx`：消息撤回时 `exit={{ opacity: 0, scale: 0.96 }}`，列表加 `popLayout`。
- `PostCard` → 详情页：给缩略图和大图同一个 `layoutId={"post-" + id}`，路由切换可做共享元素。

**坑/性能/a11y**
- 动态 key（如 `key={Math.random()}`）会导致每次 render 都 unmount，禁用。
- `mode="wait"` 期间用户连点会被吃，注意 disable 触发器。
- exit 动画期间元素仍占位（除 `popLayout`），列表里多项一起 exit 会卡。

---

## 3. drag 手势

**概念一句话**：`<motion.div drag />` 立即让元素可拖；`dragConstraints` 限定边界，`dragElastic` 控制越界回弹刚性，`useDragControls` 让你从外部按钮启动拖动（如手柄）。

**核心代码（聊天消息左滑显示操作）**

```tsx
'use client';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Reply, Flag } from 'lucide-react';

export function SwipeableMessage({ children, onReply }: { children: React.ReactNode; onReply: () => void }) {
  const x = useMotionValue(0);
  const actionOpacity = useTransform(x, [-80, -20, 0], [1, 0.4, 0]);
  return (
    <div className="relative">
      <motion.div style={{ opacity: actionOpacity }} className="absolute inset-y-0 right-3 flex items-center gap-3 text-muted-foreground">
        <Reply size={18} /> <Flag size={18} />
      </motion.div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -96, right: 0 }}
        dragElastic={0.15}
        dragSnapToOrigin
        style={{ x }}
        onDragEnd={(_, info) => { if (info.offset.x < -64) onReply(); }}
        className="bg-card p-3 rounded-lg"
      >
        {children}
      </motion.div>
    </div>
  );
}
```

**临介社区落地点**
- `src/components/chat/MessageList.tsx`（移动端）：消息项左滑露出回复/反应/举报。
- `src/app/(app)/messages/page.tsx`：DM 列表项左滑标记已读，模仿 iOS Mail。
- `src/components/posts/PostCard.tsx`：移动端可考虑右滑点赞（双向冲突，建议先做左滑收藏）。

**坑/性能/a11y**
- 拖动会与浏览器纵向滚动冲突；用 `drag="x"` 锁定单轴。
- 桌面鼠标也能拖，确认与文本选择不冲突（必要时给 `style={{ touchAction: 'pan-y' }}`）。
- 屏幕阅读器用户拿不到滑动手势，**所有滑动操作必须有等价按钮**。

---

## 4. CSS @property + transition 让渐变角度可动画

**概念一句话**：浏览器默认把 CSS 自定义属性当字符串，不能 transition；用 `@property` 把变量声明成 `<angle>` 类型后，浏览器知道它是数值，`transition` 才会插值。

**核心代码**

```css
/* globals.css */
@property --brand-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 135deg;
}

.brand-rotating {
  background: linear-gradient(var(--brand-angle),
    hsl(var(--brand-500)), hsl(var(--brand-accent-500)));
  transition: --brand-angle 600ms ease;
  animation: spin-angle 12s linear infinite;
}
@keyframes spin-angle {
  to { --brand-angle: 495deg; } /* 135 + 360 */
}

/* hover 时单次摆动 */
.brand-button:hover { --brand-angle: 225deg; }
```

**临介社区落地点**
- `src/app/globals.css`：把 `--brand-gradient` 拆成 `--brand-angle` + 静态色站，让 ticker header / 着陆页 hero 缓慢转角。
- 主 CTA 按钮（`Sign up`、`Post`）：hover 时 `--brand-angle` 从 `135deg → 225deg`，比单纯 `filter: brightness` 更精致。
- `src/app/(app)/tickers/[symbol]/page.tsx` 的 symbol 大字背景。

**坑/性能/a11y**
- 兼容性：Chrome 85+/Edge 85+/Safari 16.4+/Firefox 128+ 已支持。**Firefox < 128 fallback** 到静态渐变即可（声明在 `@property` 块外的 `--brand-angle: 135deg`）。
- `prefers-reduced-motion: reduce` 媒体查询里把 `animation: none` 关掉旋转。

---

## 5. background-clip: text 渐变文字

**概念一句话**：把渐变作为 `background-image`，再用 `-webkit-background-clip: text` 把背景"按字形裁切"，配合 `color: transparent` 让字本身透明，看到的就是渐变。

**核心代码（流光文字 + @property 联动）**

```tsx
export function BrandTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1
      className="text-display font-bold"
      style={{
        backgroundImage:
          'linear-gradient(var(--brand-angle, 135deg), hsl(var(--brand-500)), hsl(var(--brand-accent-500)), hsl(var(--brand-500)))',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        animation: 'shine 6s linear infinite',
      }}
    >
      {children}
    </h1>
  );
}
```

```css
@keyframes shine {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
```

**临介社区落地点**
- `src/app/page.tsx` 着陆页大标题 "临介社区"。
- `src/app/(app)/showcase/page.tsx` 标题 "UI 实验室"（已有 `GradientTextDemo` 可直接抽工具类 `.text-brand-gradient` 已存在于 `globals.css`，再加 `@keyframes shine` 即可）。
- `src/app/(app)/tickers/[symbol]/page.tsx` 大字 `$AAPL` symbol。

**坑/性能/a11y**
- 必须保留 `-webkit-background-clip: text`（带前缀），否则 Safari 失效；同时写 `background-clip: text` 兼容标准。
- 选区颜色会变怪：补一条 `::selection { color: white; -webkit-text-fill-color: white; }`。
- 渐变文字对**对比度**不友好，正文别用，仅限 display/H1。

---

## 6. 性能：blur 与 will-change 的成本

**概念一句话**：`backdrop-filter: blur` 每帧重采样身后所有像素（按 viewport 像素数算），是**最贵的视觉效果之一**；`filter: blur` 只渲染自身，便宜一些但仍上 GPU。

**做法**
- Aurora（大色斑 + `blur-3xl`）只放在 **`/`、`/feed` 顶部 hero、`/tickers/[symbol]` header**；列表项里**禁止** per-item blur。
- 半透明导航条用 `backdrop-blur-md` 没问题（一个固定矩形），但下拉菜单展开几十项时不要再叠 backdrop。
- `will-change: transform` 会预分配合成层；列表里给上百项加 `will-change` 反而会爆显存。仅给**正在播放动画**的元素加，动画结束后移除。

**核心代码（按 inView 才挂动画）**

```tsx
'use client';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

export function HeroAurora() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-20%' });
  return (
    <div ref={ref} className="relative h-64">
      {inView && (
        <motion.div
          className="absolute inset-0 rounded-full bg-fuchsia-500/40 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          style={{ willChange: 'transform' }}
        />
      )}
    </div>
  );
}
```

**临介社区落地点**
- `src/components/showcase/demos/AuroraDemo.tsx` 已有，**抽成 `<HeroAurora />`** 复用到 `src/app/page.tsx`、`src/app/(app)/feed/page.tsx` 顶部。
- `src/components/posts/PostCard.tsx`：**不要**加 blur 装饰；hover 用 `translate-y-[-2px] + shadow` 即可。

---

## 7. a11y：prefers-reduced-motion 降级

**概念一句话**：操作系统级偏好"减少动画"会通过 `prefers-reduced-motion: reduce` 暴露；framer-motion 的 `useReducedMotion()` 已封装为 React hook。临介社区已有薄壳 `src/hooks/useReducedMotion.ts` 和示范实现 `src/components/transitions/BlurFade.tsx`，**直接照抄它的模式**。

**三层降级**

```tsx
// 1) JS 层（framer-motion 控制的复杂动画）
import { useReducedMotion } from '@/hooks/useReducedMotion';
function Card({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.25 }}
    >{children}</motion.div>
  );
}
```

```tsx
// 2) Tailwind 修饰符（CSS 类即可表达）
<div className="motion-safe:animate-pulse motion-reduce:opacity-70" />
```

```css
/* 3) 纯 CSS keyframe 兜底 */
@media (prefers-reduced-motion: reduce) {
  .brand-rotating { animation: none; }
  *, *::before, *::after { transition-duration: 0.01ms !important; }
}
```

**临介社区落地点**
- 所有新 motion 组件**强制**第一行 `const reduced = useReducedMotion(); if (reduced) return <>{children}</>;`（参考 `BlurFade`）。
- `globals.css` 末尾加全局 `@media (prefers-reduced-motion: reduce)` 兜底，把 `--brand-angle` 旋转、Aurora 抖动一并关掉。
- Tailwind 已默认启用 `motion-safe:`/`motion-reduce:`，CSS-only 装饰直接写。

**坑**
- SSR 阶段 `useReducedMotion()` 返回 `null`/`false`，首屏可能闪一帧动画。`BlurFade` 的处理方式（直接 return children）即是规避。
- 不要用 `reduced ? duration:0 : x` 做"瞬移"，用户期望是**直接终态**而不是 0s 过渡（中间帧仍可能跳）。直接 `return children`。

---

# 优先级清单

**立即可落（搭配后台 UI 重设计代理 a80bce87b5aac0aa3）**
1. **CommentTree 折叠/展开 layout 动画** — `src/components/posts/CommentTree.tsx`。低风险、高感知收益，配方 §1 直接抄。
2. **`@property --brand-angle` + 流光标题** — 修改 `src/app/globals.css` 注册 `@property`，`src/app/page.tsx` 标题套 `.text-brand-gradient` + `animation: shine`。配方 §4+§5。
3. **FeedList 视图切换 layout** — `src/components/posts/FeedList.tsx` + `FeedViewToggle.tsx`，给 `<li>` 加 `layout`。配方 §1。

**中期**
4. **消息左滑操作** — `src/components/chat/MessageList.tsx` 移动端，配方 §3。需配套确认与按钮等价路径（a11y）。
5. **共享 layoutId** — `PostCard ↔ /posts/[id]` 详情页缩略图放大，配方 §2。

**长期 / 慎重**
6. **Aurora 抽公共 `<HeroAurora />`** 仅在 hero 区使用，明确禁用在 PostCard 列表层。配方 §6。

---

**未在文档内但建议主代理跟进的两件事**
- `src/app/globals.css` 末尾补全局 `@media (prefers-reduced-motion: reduce)` 降级块（项目目前只有组件级处理）。
- `src/components/transitions/` 下新增 `<LayoutGroup>` 或 `<MotionList>` 工具组件，封装 `popLayout + layout` 的常用模式，避免每个用点都重写。
