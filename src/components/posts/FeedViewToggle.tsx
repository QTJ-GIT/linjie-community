'use client';

import Link from 'next/link';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FeedViewMode = 'card' | 'compact';

export interface FeedViewToggleProps {
  /**
   * Currently selected sort key. Only used when `basePath` defaults to `/feed`
   * so we can keep the existing `?sort=...&view=...` shape unchanged.
   * Ignored when `basePath` is provided alongside `extraParams`.
   */
  currentSort?: string;
  currentView: FeedViewMode;
  /**
   * Page the toggle should link to. Defaults to `/feed` (legacy behavior).
   */
  basePath?: string;
  /**
   * Extra query params merged into both card / compact links — useful for
   * pages like /bookmarks or /search where we need to preserve `q`, `kind`
   * etc. The `view` param is managed by this component itself and overwritten.
   */
  extraParams?: Record<string, string | undefined>;
}

function buildHref(
  basePath: string,
  view: FeedViewMode,
  extra: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(extra)) {
    if (v != null && v !== '') params.set(k, v);
  }
  // Card is the default — omit `view` to keep URLs clean.
  if (view === 'compact') params.set('view', 'compact');
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function FeedViewToggle({
  currentSort,
  currentView,
  basePath,
  extraParams,
}: FeedViewToggleProps) {
  // Legacy /feed path: preserve `sort` automatically when no explicit base provided.
  const resolvedBase = basePath ?? '/feed';
  const resolvedExtra: Record<string, string | undefined> =
    extraParams ?? (currentSort ? { sort: currentSort } : {});

  const cardHref = buildHref(resolvedBase, 'card', resolvedExtra);
  const compactHref = buildHref(resolvedBase, 'compact', resolvedExtra);

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-background p-0.5"
      role="group"
      aria-label="视图模式"
    >
      <Link
        href={cardHref}
        aria-label="卡片视图"
        aria-pressed={currentView === 'card'}
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-[5px] transition-colors',
          'text-muted-foreground hover:text-foreground',
          currentView === 'card' && 'bg-muted text-foreground shadow-sm'
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </Link>
      <Link
        href={compactHref}
        aria-label="紧凑视图"
        aria-pressed={currentView === 'compact'}
        className={cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-[5px] transition-colors',
          'text-muted-foreground hover:text-foreground',
          currentView === 'compact' && 'bg-muted text-foreground shadow-sm'
        )}
      >
        <List className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
