'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  MessageSquare,
  HelpCircle,
  TrendingUp,
  Flame,
  LineChart,
  MessagesSquare,
  Bookmark,
  Bell,
  Mail,
  User,
  Users,
  ShieldCheck,
  Hash,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { SectionTreeNode } from '@/types/domain';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

// 给已知 slug 一个固定图标；未知 slug fallback 到通用图标
const SECTION_ICONS: Record<string, LucideIcon> = {
  general: MessageSquare,
  qa: HelpCircle,
  stocks: TrendingUp,
};

function iconForSection(slug: string): LucideIcon {
  return SECTION_ICONS[slug] ?? Hash;
}

const STATIC_BROWSE_HEAD: NavItem[] = [
  { href: '/feed', label: '首页', icon: Home },
];

const STATIC_BROWSE_TAIL: NavItem[] = [
  { href: '/teaching', label: '教学大厅', icon: GraduationCap },
  { href: '/tickers', label: '股票', icon: LineChart },
  { href: '/trending', label: '热度', icon: Flame },
];

const SOCIAL: NavItem[] = [
  { href: '/chat/lobby', label: '聊天室', icon: MessagesSquare },
  { href: '/messages', label: '消息', icon: Mail },
  { href: '/following', label: '关注动态', icon: Users },
];

const MINE: NavItem[] = [
  { href: '/bookmarks', label: '我的收藏', icon: Bookmark },
  { href: '/notifications', label: '通知', icon: Bell },
  { href: '/profile', label: '我的主页', icon: User },
];

const EXTRAS_BASE: NavItem[] = [];

export function Sidebar({
  className,
  sectionTree = [],
  activeUsersSlot,
}: {
  className?: string;
  sectionTree?: SectionTreeNode[];
  activeUsersSlot?: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();
      if (!cancelled && data?.is_admin) setIsAdmin(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sections = React.useMemo<NavSection[]>(() => {
    const extras = [...EXTRAS_BASE];
    if (isAdmin) {
      extras.push({ href: '/admin', label: '管理后台', icon: ShieldCheck });
    }
    return [
      { id: 'social', label: '社交', items: SOCIAL },
      { id: 'mine', label: '我的', items: MINE },
      ...(extras.length > 0 ? [{ id: 'extras', label: '其他', items: extras }] : []),
    ];
  }, [isAdmin]);

  return (
    <nav className={cn('flex flex-col gap-6 py-5 text-sm', className)}>
      {/* 浏览：固定首页 + 数据驱动版块树 + 固定 tail */}
      <div className="flex flex-col gap-0.5">
        <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
          浏览
        </div>
        {STATIC_BROWSE_HEAD.map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} />
        ))}
        {sectionTree.map((node) => (
          <SectionNavTreeItem key={node.slug} node={node} pathname={pathname} depth={0} />
        ))}
        {STATIC_BROWSE_TAIL.map((item) => (
          <SidebarLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>

      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-0.5">
          <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
            {section.label}
          </div>
          {section.items.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      ))}

      {activeUsersSlot ? (
        <div className="mt-2 border-t border-border/60 pt-2">{activeUsersSlot}</div>
      ) : null}
    </nav>
  );
}

function SectionNavTreeItem({
  node,
  pathname,
  depth,
}: {
  node: SectionTreeNode;
  pathname: string;
  depth: number;
}) {
  const item: NavItem = {
    href: `/s/${node.slug}`,
    label: node.name,
    icon: iconForSection(node.slug),
  };
  return (
    <>
      <SidebarLink item={item} pathname={pathname} depth={depth} />
      {node.children.map((child) => (
        <SectionNavTreeItem
          key={child.slug}
          node={child}
          pathname={pathname}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

function SidebarLink({
  item,
  pathname,
  depth = 0,
}: {
  item: NavItem;
  pathname: string;
  depth?: number;
}) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-md py-1.5 transition-colors',
        depth === 0 ? 'px-3' : 'pr-3',
        active
          ? 'font-medium text-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
      )}
      style={depth > 0 ? { paddingLeft: `${0.75 + depth * 1}rem` } : undefined}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full transition-all',
          active ? 'bg-foreground' : 'bg-transparent'
        )}
      />
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-colors',
          active
            ? 'text-[hsl(var(--brand-500))]'
            : 'text-muted-foreground/80 group-hover:text-foreground'
        )}
      />
      <span>{item.label}</span>
    </Link>
  );
}

function isActive(path: string, href: string): boolean {
  if (href === '/feed') {
    return path === '/feed' || path === '/';
  }
  return path === href || path.startsWith(`${href}/`);
}
