# Group H 集成备忘（SEO / 分享 / 性能）

## 1. ShareMenu 集成

在 `src/components/posts/PostCard.tsx` 的卡片右上角或 footer 操作区加入：

```tsx
import { ShareMenu } from '@/components/posts/ShareMenu';

// 建议放在 VoteButtons / BookmarkButton 同一行的最右端：
<ShareMenu postId={post.id} title={post.title} />
```

在 `src/app/(app)/posts/[id]/page.tsx` 的 `<BookmarkButton />` 后面也可追加：

```tsx
<ShareMenu postId={post.id} title={post.title} />
```

组件本身是 `'use client'`，内部用 `navigator.clipboard` / `navigator.share`。不做服务端渲染分支，直接 drop-in 即可。

## 2. SmartTime 替换列表

把所有 `{formatRelative(x)}` 渲染处替换为 `<SmartTime iso={x} />`，以获得绝对时间 tooltip 和 `<time>` 语义标签。涉及文件：

- `src/components/posts/PostCard.tsx`
- `src/components/posts/CommentTree.tsx`
- `src/components/chat/MessageList.tsx`
- `src/components/dm/DmList.tsx`
- `src/components/dm/DmThread.tsx`
- `src/components/polls/PollView.tsx`
- `src/components/notifications/NotificationList.tsx`
- `src/app/(app)/posts/[id]/page.tsx`（头部时间）
- `src/app/(app)/profile/[handle]/page.tsx`（最近帖子列表）

示例：
```tsx
import { SmartTime } from '@/components/smart-time';
// 旧：<span>{formatRelative(post.created_at)}</span>
// 新：<SmartTime iso={post.created_at} className="text-xs text-muted-foreground" />
```

## 3. 环境变量

生产环境必须设置：
```
NEXT_PUBLIC_SITE_URL=https://linjie.example.com
```
用于 sitemap / robots / RSS / OG / canonical URL。本地缺省回退到 `http://localhost:3000`。

## 4. 新增路由一览

| 路由 | 说明 |
| --- | --- |
| `/sitemap.xml` | 自动生成 |
| `/robots.txt` | 自动生成 |
| `/feed.xml` | RSS 2.0，30 篇最新帖子，10 分钟缓存 |
| `/opengraph-image` | 站点默认 OG（1200x630） |
| `/posts/[id]/opengraph-image` | 按情绪换色的动态帖子 OG |
