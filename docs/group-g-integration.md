# Group G 集成说明（命令面板 / 骨架屏 / 空状态 / 错误页）

本文档列出本轮新增 UX 组件的使用方式。所有文件均未触碰被 claimed 的页面和组件，集成工作由对应 owner 自行完成。

## 1. EmptyState 空状态组件

导入路径：`@/components/empty-state`

### 推荐投放点

| 页面 | 建议文案 |
| --- | --- |
| `src/app/(app)/feed/page.tsx` | 无关注内容时 |
| `src/app/(app)/search/page.tsx` | 搜索无结果 |
| `src/app/(app)/bookmarks/page.tsx` | 还没有收藏 |
| `src/app/(app)/notifications/page.tsx` | 没有通知 |
| `src/app/(app)/profile/[handle]/page.tsx` | 个人主页没有帖子 |
| `src/app/(app)/trending/page.tsx` | 暂无热门 |
| `src/app/(app)/tickers/page.tsx` | 替换当前的 `<p>暂无股票。</p>` |

### 示例 JSX

```tsx
import { EmptyState } from '@/components/empty-state';
import { Inbox, SearchX, Bookmark, Bell, FileText } from 'lucide-react';

// Feed 无帖子
<EmptyState
  icon={Inbox}
  title="还没有内容"
  description="关注一些版块或用户后，这里会出现他们的动态。"
  action={{ label: '去发现', href: '/trending' }}
/>

// 搜索无结果
<EmptyState icon={SearchX} title="没有匹配的结果" description="换个关键词试试？" />

// 书签为空
<EmptyState icon={Bookmark} title="还没有收藏" description="在帖子页点击收藏按钮即可保存。" />

// 通知为空
<EmptyState icon={Bell} title="目前没有通知" />

// 个人主页空
<EmptyState
  icon={FileText}
  title="还没有发过帖子"
  action={{ label: '去发布', href: '/posts/new' }}
/>
```

## 2. 命令面板（Cmd+K）

- `ShortcutsProvider` 已经挂载到 `src/app/layout.tsx`，全站可用。
- 用户按 `Cmd+K` / `Ctrl+K` / `/` 即可打开，`?` 打开键盘帮助。

### Navbar 搜索按钮接入（推荐）

如果 `src/components/shell/Navbar.tsx` 里已有搜索按钮，让它改为"打开命令面板"即可（一行 JSX 调整）：

```tsx
// Navbar.tsx 顶部加：
'use client';
import { useState } from 'react';
import { CommandPalette } from '@/components/command-palette';

// 然后在组件内：
const [open, setOpen] = useState(false);

// 把原搜索按钮的 onClick 改成：
<Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
  <Search className="h-4 w-4" /> 搜索
  <kbd className="ml-2 rounded border bg-muted px-1 text-[10px]">⌘K</kbd>
</Button>

// 并在 JSX 末尾加：
<CommandPalette open={open} onOpenChange={setOpen} />
```

> 注意：`ShortcutsProvider` 自身已经渲染了一个 `CommandPalette` 实例用于全局快捷键；Navbar 里再加一个是为了让点击按钮也能触发。两者互不影响（Radix Dialog 是互斥的，只有当前 open 的那个会展示）。若不想双实例，可以把 Navbar 的按钮改为触发 `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))`，由全局 provider 接管。

## 3. 键盘快捷键（已经生效）

所有快捷键在用户聚焦于 `<input>` / `<textarea>` / `contenteditable` 时不会触发。

| 快捷键 | 行为 |
| --- | --- |
| `Cmd+K` / `Ctrl+K` | 打开命令面板 |
| `/` | 打开命令面板并聚焦搜索框 |
| `?` | 打开键盘帮助对话框 |
| `g f` | 跳转 `/feed` |
| `g t` | 跳转 `/trending` |
| `g c` | 跳转 `/chat/lobby` |
| `g n` | 跳转 `/notifications` |
| `g p` | 跳转 `/profile` |
| `↑` / `↓` | （面板内）移动选中 |
| `Enter` | （面板内）执行 |
| `Esc` | 关闭弹层 |

## 4. 骨架屏 & 错误页（已自动生效）

- 所有列出的 `loading.tsx` 已创建，Next.js App Router 会自动在 Suspense 边界使用它们。
- `src/app/error.tsx` 是全局错误边界，`src/app/(app)/error.tsx` 是 `(app)` 段的错误边界。
- `src/app/not-found.tsx` 是全局 404。
- `<Skeleton />` 原语：`import { Skeleton } from '@/components/ui/skeleton'`，传 className 控制尺寸。

## 5. 新增文件清单

- `src/components/ui/skeleton.tsx`
- `src/components/empty-state.tsx`
- `src/components/command-palette.tsx`
- `src/components/keyboard-help.tsx`
- `src/components/shortcuts-provider.tsx`
- `src/hooks/use-hotkeys.ts`
- `src/app/not-found.tsx`
- `src/app/error.tsx`
- `src/app/(app)/error.tsx`
- 十个 `loading.tsx`（feed / s/[section] / posts/[id] / tickers / tickers/[symbol] / chat/[room] / notifications / profile/[handle] / trending / search）

## 6. 对 `src/app/layout.tsx` 的唯一改动

仅增加 `ShortcutsProvider` 的 import 与 `<ShortcutsProvider />` 挂载，未修改其它代码。
