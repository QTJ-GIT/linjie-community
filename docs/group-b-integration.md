# Group B 集成备忘

本备忘列出 Group B 在 Agent A 所拥有文件中需要做的少量改动。

## 1. `profile/[handle]/page.tsx`

在统计行（粉丝/关注数）附近、与 "编辑资料" 按钮同一行渲染：

```tsx
import { FollowButton } from '@/components/profile/FollowButton';
import { openThreadWith } from '@/actions/dm';

// 预先在服务端查询:
// const { data: myFollow } = await supabase
//   .from('follows')
//   .select('follower_id')
//   .eq('follower_id', currentUser?.id ?? '')
//   .eq('following_id', targetUser.id)
//   .maybeSingle();
// const initiallyFollowing = !!myFollow;
// const { count: followerCount } = await supabase
//   .from('follows').select('*', { count: 'exact', head: true })
//   .eq('following_id', targetUser.id);

<FollowButton
  targetUserId={targetUser.id}
  currentUserId={currentUser?.id ?? null}
  initiallyFollowing={initiallyFollowing}
  initialFollowerCount={followerCount ?? 0}
/>

{currentUser && currentUser.id !== targetUser.id ? (
  <form action={openThreadWith.bind(null, targetUser.id)}>
    <Button type="submit" variant="outline" size="sm">私信</Button>
  </form>
) : null}
```

## 2. `tickers/[symbol]/page.tsx`

在标题行（symbol 旁）渲染 `FollowTickerButton`：

```tsx
import { FollowTickerButton } from '@/components/tickers/FollowTickerButton';

// const { data: row } = await supabase
//   .from('ticker_follows').select('user_id')
//   .eq('user_id', user.id).eq('symbol', symbol).maybeSingle();

<FollowTickerButton symbol={symbol} initiallyFollowing={!!row} />
```

## 3. 可选 SQL 种子

```sql
insert into follows (follower_id, following_id)
values ('<uuid_a>', '<uuid_b>') on conflict do nothing;
insert into ticker_follows (user_id, symbol)
values ('<uuid_a>', 'AAPL') on conflict do nothing;
```
