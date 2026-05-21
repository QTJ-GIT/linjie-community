import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { NotificationsPageClient } from './page-client';
import type { Notification, NotificationKind, NotificationWithActor, Profile } from '@/types/domain';

type ActorSlim = Pick<Profile, 'id' | 'handle' | 'display_name' | 'avatar_url'>;

export const dynamic = 'force-dynamic';

type KindFilter = 'all' | 'mention' | 'comment' | 'like' | 'answer_accepted';

const TABS: { key: KindFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'mention', label: '提及' },
  { key: 'comment', label: '评论' },
  { key: 'like', label: '点赞' },
  { key: 'answer_accepted', label: '答案被采纳' },
];

function parseKind(v: string | undefined): KindFilter {
  if (
    v === 'mention' ||
    v === 'comment' ||
    v === 'like' ||
    v === 'answer_accepted' ||
    v === 'all'
  ) {
    return v;
  }
  return 'all';
}

function matchesKind(kind: NotificationKind, filter: KindFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'mention') return kind === 'mention';
  if (filter === 'comment') return kind === 'comment_on_post' || kind === 'reply_to_comment';
  if (filter === 'like') return kind === 'like';
  if (filter === 'answer_accepted') return kind === 'answer_accepted';
  return true;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: { kind?: string };
}) {
  const kind = parseKind(searchParams?.kind);
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/notifications');
  }

  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, recipient_id, actor_id, kind, post_id, comment_id, read_at, created_at, actor:profiles!notifications_actor_id_fkey(id, handle, display_name, avatar_url)'
    )
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight">通知</h1>
        <p className="text-sm text-destructive">加载失败：{error.message}</p>
      </div>
    );
  }

  const allItems: NotificationWithActor[] = (data ?? []).map((row: Record<string, unknown>) => ({
    ...(row as unknown as Notification),
    actor: (row.actor ?? null) as ActorSlim | null,
  }));

  // Order: unread first, then by created_at desc (already pre-sorted by created_at).
  const sorted = [...allItems].sort((a, b) => {
    const aUnread = a.read_at ? 0 : 1;
    const bUnread = b.read_at ? 0 : 1;
    if (aUnread !== bUnread) return bUnread - aUnread;
    return b.created_at.localeCompare(a.created_at);
  });

  const filtered = sorted.filter((n) => matchesKind(n.kind, kind));
  const unreadCount = allItems.filter((n) => !n.read_at).length;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 p-4 sm:p-6">
      {/* Hero */}
      <section className="rounded-2xl border border-border/60 px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-[hsl(var(--brand-500))]">
              收件箱
            </p>
            <h1 className="mt-1 font-display text-h2 font-semibold tracking-tight">
              通知
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              和你有关的动态都在这里。
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-wider tabular-nums text-muted-foreground/80">
              <span>
                <span className="font-semibold text-foreground">{allItems.length}</span> 条
              </span>
              <span aria-hidden className="text-muted-foreground/40">·</span>
              <span>
                未读 <span className="font-semibold text-foreground">{unreadCount}</span>
              </span>
            </div>
          </div>
          {/* "全部已读" lives in the client (it needs the action) */}
        </div>
      </section>

      {/* Kind 分组 Tabs — underline 风格 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
        <nav aria-label="通知类型" className="flex items-center gap-1 overflow-x-auto text-sm">
          {TABS.map((t) => {
            const active = t.key === kind;
            const href = t.key === 'all' ? '/notifications' : `/notifications?kind=${t.key}`;
            return (
              <Link
                key={t.key}
                href={href}
                data-state={active ? 'active' : 'inactive'}
                className={cn(
                  'relative inline-flex shrink-0 items-center px-2.5 py-1.5 font-medium transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
                <span
                  aria-hidden
                  className={cn(
                    'pointer-events-none absolute inset-x-1.5 -bottom-[9px] h-[2px] rounded-full transition-all',
                    active ? 'bg-foreground' : 'bg-transparent'
                  )}
                />
              </Link>
            );
          })}
        </nav>
      </div>

      {filtered.length === 0 ? (
        <EmptyNotice kind={kind} totalEmpty={allItems.length === 0} />
      ) : (
        <NotificationsPageClient initialItems={filtered} initialUnreadCount={unreadCount} />
      )}
    </div>
  );
}

function EmptyNotice({ kind, totalEmpty }: { kind: KindFilter; totalEmpty: boolean }) {
  const description = totalEmpty
    ? '当有人 @你、回复、点赞或采纳你的回答时，通知会出现在这里。'
    : '换一个分类看看？';
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 bg-muted/15 px-6 py-16 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span aria-hidden className="absolute inset-0 rounded-full bg-brand-gradient opacity-15 blur-xl" />
        <span aria-hidden className="absolute inset-2 rounded-full bg-brand-gradient-soft" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-background ring-1 ring-border/60">
          <Bell className="h-6 w-6 text-[hsl(var(--brand-500))]" aria-hidden />
        </span>
      </div>
      <h3 className="text-base font-semibold tracking-tight">
        {totalEmpty ? '目前没有通知' : `没有“${labelOf(kind)}”类通知`}
      </h3>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function labelOf(k: KindFilter): string {
  return TABS.find((t) => t.key === k)?.label ?? '全部';
}
