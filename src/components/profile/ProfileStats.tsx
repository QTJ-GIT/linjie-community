import { NumberTicker } from '@/components/effects/NumberTicker';

export interface ProfileStatsProps {
  karma: number;
  postCount: number;
  commentCount: number;
  followerCount: number;
}

interface StatCellProps {
  value: number;
  label: string;
}

function StatCell({ value, label }: StatCellProps) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-4">
      <NumberTicker
        to={value}
        className="text-2xl font-display tabular-nums"
        monospace={false}
      />
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

/**
 * ProfileStats — 4 列单层细线 stat 条，每格用 NumberTicker 做数字动画。
 */
export function ProfileStats({
  karma,
  postCount,
  commentCount,
  followerCount,
}: ProfileStatsProps) {
  return (
    <section
      className="grid grid-cols-4 divide-x divide-border/60 rounded-2xl border border-border/60 bg-card/50 text-center"
      aria-label="用户统计"
    >
      <StatCell value={karma} label="Karma" />
      <StatCell value={postCount} label="Posts" />
      <StatCell value={commentCount} label="Comments" />
      <StatCell value={followerCount} label="Followers" />
    </section>
  );
}
