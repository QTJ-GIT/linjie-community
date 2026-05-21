import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { GradientMesh } from '@/components/effects/GradientMesh';
import { FollowButton } from '@/components/profile/FollowButton';
import { openThreadWith } from '@/actions/dm';
import type { Profile } from '@/types/domain';

export interface ProfileHeroProps {
  profile: Profile;
  isSelf: boolean;
  currentUserId: string | null;
  initiallyFollowing: boolean;
  followerCount: number;
}

function formatJoinedAt(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * ProfileHero — 个人主页顶部 hero。
 * GradientMesh 作为底色，avatar 重叠在 hero 上半区，
 * 与 display_name / handle / 加入时间 / bio / 操作按钮一同布局。
 */
export function ProfileHero({
  profile,
  isSelf,
  currentUserId,
  initiallyFollowing,
  followerCount,
}: ProfileHeroProps) {
  const fallback = (profile.display_name?.charAt(0) ?? profile.handle.charAt(0)).toUpperCase();
  const joined = formatJoinedAt(profile.created_at);

  return (
    <section className="relative isolate overflow-hidden rounded-2xl border border-border/60">
      {/* 底层渐变 mesh + 半透明 backdrop 保证文字可读 */}
      <div className="relative h-[200px]">
        <GradientMesh blur={50} className="absolute inset-0 -z-10 opacity-50" />
        <div className="absolute inset-0 -z-10 bg-background/55 backdrop-blur-[2px]" />
      </div>

      {/* 内容层 — 负 margin 把 avatar 提到 hero 上沿 */}
      <div className="relative -mt-20 px-5 pb-5 sm:px-7 sm:pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
          <Avatar className="h-20 w-20 shrink-0 ring-4 ring-background shadow-lg">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
            ) : null}
            <AvatarFallback className="text-2xl">{fallback}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="truncate font-display text-display text-[2rem] sm:text-[2.25rem]">
              {profile.display_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">@{profile.handle}</span>
              <span aria-hidden className="mx-2 text-muted-foreground/50">
                ·
              </span>
              <span>加入于 {joined}</span>
            </p>
            {profile.bio ? (
              <p className="pt-1.5 text-sm leading-relaxed text-foreground/85">{profile.bio}</p>
            ) : null}
          </div>

          <div className="sm:self-start">
            {isSelf ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/profile/edit">编辑资料</Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <FollowButton
                  targetUserId={profile.id}
                  currentUserId={currentUserId}
                  initiallyFollowing={initiallyFollowing}
                  initialFollowerCount={followerCount}
                />
                {currentUserId ? (
                  <form action={openThreadWith.bind(null, profile.id)}>
                    <Button type="submit" variant="outline" size="sm">
                      私信
                    </Button>
                  </form>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
