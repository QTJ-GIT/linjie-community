import { PostCard } from './PostCard';
import { cn } from '@/lib/utils';
import type { PostWithAuthor } from '@/types/domain';

export interface TrendingPostRowProps {
  rank: number;
  hotScore: number;
  maxHot: number;
  post: PostWithAuthor;
  className?: string;
}

/**
 * 热度榜单行：rank 大字 + 相对热度细 bar + compact PostCard。
 * 相对宽度按 maxHot 归一化，最小 4% 防止 0 宽度看不见。
 */
export function TrendingPostRow({
  rank,
  hotScore,
  maxHot,
  post,
  className,
}: TrendingPostRowProps) {
  const safeMax = Math.max(maxHot, 0.0001);
  const widthPct = Math.max((hotScore / safeMax) * 100, 4);

  return (
    <div
      className={cn(
        'group/row flex items-stretch gap-3 rounded-xl border border-border/60 bg-card transition-colors hover:border-border',
        className
      )}
    >
      <div className="flex w-12 shrink-0 flex-col items-center justify-center border-r border-border/40 px-1 py-3">
        <span className="font-display text-3xl font-bold tabular-nums leading-none text-muted-foreground/40 group-hover/row:text-muted-foreground/70">
          {rank}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 px-4 pt-2.5">
          <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[hsl(var(--brand-500))] transition-[width] duration-300 ease-out"
              style={{ width: `${widthPct}%` }}
            />
          </div>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground/60">
            {hotScore.toFixed(1)}
          </span>
        </div>
        <PostCard post={post} mode="compact" className="!px-4 !py-2" />
      </div>
    </div>
  );
}
