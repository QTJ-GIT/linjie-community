'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { NotificationList } from '@/components/notifications/NotificationList';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { items, unreadCount, markRead, markAllRead, loading } = useNotifications();

  const preview = items.slice(0, 10);
  const badge = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="通知"
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-[18px] text-destructive-foreground'
              )}
            >
              {badge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-sm font-semibold">通知</span>
          <button
            onClick={() => markAllRead()}
            disabled={unreadCount === 0}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            全部标为已读
          </button>
        </div>
        <Separator />
        <ScrollArea className="max-h-[360px]">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              加载中…
            </div>
          ) : (
            <NotificationList items={preview} onRead={markRead} />
          )}
        </ScrollArea>
        <Separator />
        <div className="px-4 py-2 text-center">
          <Link
            href="/notifications"
            className="text-sm text-primary hover:underline"
          >
            查看全部
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
