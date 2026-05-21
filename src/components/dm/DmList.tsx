import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/empty-state';
import { SmartTime } from '@/components/smart-time';
import { cn } from '@/lib/utils';
import type { DmThreadWithPeer } from '@/types/domain';

export interface DmListProps {
  threads: DmThreadWithPeer[];
  className?: string;
}

export function DmList({ threads, className }: DmListProps) {
  if (threads.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="还没有私信"
        description="去主页关注一些人，开启对话吧。"
        action={{ label: '去发现', href: '/feed' }}
        className={className}
      />
    );
  }

  return (
    <ul
      className={cn(
        'flex flex-col divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card',
        className
      )}
    >
      {threads.map((t) => {
        const peer = t.other_user;
        const fallback = peer.display_name?.slice(0, 1) || peer.handle.slice(0, 1) || '?';
        const unread = t.unread_count ?? 0;
        return (
          <li key={t.id}>
            <Link
              href={`/messages/${t.id}`}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
            >
              <Avatar className="h-10 w-10 shrink-0">
                {peer.avatar_url ? (
                  <AvatarImage src={peer.avatar_url} alt={peer.display_name} />
                ) : null}
                <AvatarFallback className="text-xs">{fallback}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{peer.display_name}</span>
                  {t.last_message_at ? (
                    <SmartTime
                      iso={t.last_message_at}
                      className="shrink-0 font-mono text-[11px] text-muted-foreground"
                    />
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground"></span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="truncate text-xs text-muted-foreground">
                    {t.last_message_preview ?? '暂无消息'}
                  </p>
                  {unread > 0 ? (
                    <Badge
                      variant="default"
                      className="ml-auto h-5 shrink-0 rounded-full px-1.5 py-0 text-[10px] font-mono tabular-nums"
                    >
                      {unread}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
