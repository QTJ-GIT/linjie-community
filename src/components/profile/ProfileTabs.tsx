import Link from 'next/link';
import { cn } from '@/lib/utils';

export type ProfileTabKey = 'posts' | 'comments' | 'about';

export interface ProfileTabsProps {
  handle: string;
  active: ProfileTabKey;
}

const TABS: { key: ProfileTabKey; label: string }[] = [
  { key: 'posts', label: '帖子' },
  { key: 'comments', label: '评论' },
  { key: 'about', label: '关于' },
];

export function parseProfileTab(value: string | undefined): ProfileTabKey {
  if (value === 'comments' || value === 'about') return value;
  return 'posts';
}

/**
 * ProfileTabs — URL 驱动的 underline tabs。Server-friendly：纯 <Link> 切换。
 * 视觉与 feed 排序条一致：text-foreground + 细线 underline。
 */
export function ProfileTabs({ handle, active }: ProfileTabsProps) {
  return (
    <nav
      aria-label="个人主页内容"
      className="flex items-center gap-1 border-b border-border/60 text-sm"
    >
      {TABS.map((t) => {
        const isActive = t.key === active;
        const href =
          t.key === 'posts'
            ? `/profile/${handle}`
            : `/profile/${handle}?tab=${t.key}`;
        return (
          <Link
            key={t.key}
            href={href}
            data-state={isActive ? 'active' : 'inactive'}
            className={cn(
              'relative inline-flex items-center px-3 py-2 font-medium transition-colors',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-x-2 -bottom-[1px] h-[2px] rounded-full transition-all',
                isActive ? 'bg-foreground' : 'bg-transparent'
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
