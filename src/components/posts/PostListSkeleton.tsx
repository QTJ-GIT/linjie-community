import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface PostListSkeletonProps {
  count?: number;
  className?: string;
}

// Slight per-row variation in widths so the skeleton has rhythm rather than
// reading as a flat block of identical bars.
const TITLE_WIDTHS = ['w-3/4', 'w-2/3', 'w-4/5', 'w-1/2', 'w-3/5', 'w-2/3'];
const SUMMARY_WIDTHS = ['w-full', 'w-5/6', 'w-11/12', 'w-3/4'];
const META_WIDTHS = [
  ['w-24', 'w-16'],
  ['w-20', 'w-12'],
  ['w-28', 'w-14'],
];

/**
 * Skeleton mirroring PostCard layout. Used as Suspense fallback for feed pages
 * while posts stream in. Width variation hints at varied content rhythm.
 *
 * 重设计：与新版 PostCard 同步 —— 单层细线（border-border/60）、去掉重阴影。
 */
export function PostListSkeleton({ count = 6, className }: PostListSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const titleW = TITLE_WIDTHS[i % TITLE_WIDTHS.length];
        const summary1 = SUMMARY_WIDTHS[i % SUMMARY_WIDTHS.length];
        const summary2 = SUMMARY_WIDTHS[(i + 2) % SUMMARY_WIDTHS.length];
        const [meta1, meta2] = META_WIDTHS[i % META_WIDTHS.length]!;
        return (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-card px-5 py-5"
          >
            <div className="flex items-start gap-3.5">
              <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
                <Skeleton className="h-6 w-6 rounded-md" />
                <Skeleton className="h-4 w-6" />
                <Skeleton className="h-6 w-6 rounded-md" />
              </div>
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2.5">
                <div className="flex gap-2">
                  <Skeleton className={cn('h-3', meta1)} />
                  <Skeleton className={cn('h-3', meta2)} />
                </div>
                <Skeleton className={cn('h-5', titleW)} />
                <Skeleton className={cn('h-4', summary1)} />
                <Skeleton className={cn('h-4', summary2)} />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-10" />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
