import Link from 'next/link';
import { Pin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SentimentBadge } from './SentimentBadge';
import { UnreadStripe } from './UnreadStripe';
import { PostCardVote } from './post-card/Vote';
import { PostCardHeader } from './post-card/Header';
import { PostCardBody } from './post-card/Body';
import { PostCardFooter } from './post-card/Footer';
import type { PostWithAuthor } from '@/types/domain';

export type PostCardMode = 'card' | 'compact';

export interface PostCardProps {
  post: PostWithAuthor;
  mode?: PostCardMode;
  className?: string;
}

interface PostCardComponent {
  (props: PostCardProps): JSX.Element;
  Vote: typeof PostCardVote;
  Header: typeof PostCardHeader;
  Body: typeof PostCardBody;
  Footer: typeof PostCardFooter;
}

const PostCardImpl = ({ post, mode = 'card', className }: PostCardProps) => {
  const initials = (post.author.display_name ?? post.author.handle ?? '?').slice(0, 1);

  if (mode === 'compact') {
    return (
      <article
        className={cn(
          'group relative px-4 py-3 transition-colors hover:bg-muted/30',
          className
        )}
      >
        <UnreadStripe createdAt={post.created_at} scope="feed" />
        <div className="flex items-start gap-3">
          <div className="flex shrink-0 items-center pt-0.5">
            <PostCardVote post={post} size="sm" orientation="horizontal" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <PostCardHeader post={post} showAvatar={false} className="text-xs" />
              {post.is_pinned ? (
                <Badge
                  variant="outline"
                  className="h-5 gap-1 border-amber-500/40 bg-amber-500/10 px-1.5 py-0 text-[10px] font-medium text-amber-700 dark:text-amber-300"
                >
                  <Pin className="h-3 w-3" />
                  置顶
                </Badge>
              ) : null}
              {post.sentiment ? <SentimentBadge sentiment={post.sentiment} /> : null}
            </div>
            <PostCardBody
              post={post}
              clamp={1}
              showTickers
              titleClassName="mt-1 text-[15px]"
              className="mt-0.5"
            />
            <PostCardFooter post={post} showReactions={false} className="mt-2" />
          </div>
        </div>
      </article>
    );
  }

  // card mode — Vercel/shadcn 风格：单层细线 + hover 显微 ring，去掉重阴影
  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/60 bg-card transition-all duration-200',
        'hover:border-border hover:ring-1 hover:ring-[hsl(var(--brand-500))]/20',
        className
      )}
    >
      <UnreadStripe createdAt={post.created_at} scope="feed" />
      {/* Top-right overlay: sentiment + pinned */}
      {(post.sentiment || post.is_pinned) && (
        <div className="pointer-events-none absolute right-4 top-4 z-10 flex items-center gap-2">
          {post.is_pinned ? (
            <span
              className={cn(
                'pointer-events-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-white',
                'bg-gradient-to-r from-amber-500 to-orange-500 shadow-sm'
              )}
            >
              <Pin className="h-3 w-3" />
              置顶
            </span>
          ) : null}
          {post.sentiment ? (
            <span className="pointer-events-auto">
              <SentimentBadge sentiment={post.sentiment} />
            </span>
          ) : null}
        </div>
      )}

      <div className="px-5 py-5">
        <div className="flex items-start gap-3.5">
          <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
            <PostCardVote post={post} size="sm" orientation="vertical" />
          </div>
          <Link href={`/profile/${post.author.handle}`} className="shrink-0">
            <Avatar className="h-9 w-9 ring-2 ring-transparent transition-all group-hover:ring-[hsl(var(--brand-500))]/25">
              {post.author.avatar_url ? (
                <AvatarImage src={post.author.avatar_url} alt={post.author.display_name} />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <PostCardHeader post={post} showAvatar={false} />
            <PostCardBody
              post={post}
              clamp={2}
              showTickers
              titleClassName="mt-2 pr-24 text-[1.0625rem]"
              className="mt-0"
            />
            <PostCardFooter post={post} showReactions className="mt-4" />
          </div>
        </div>
      </div>
    </article>
  );
};

export const PostCard = PostCardImpl as PostCardComponent;
PostCard.Vote = PostCardVote;
PostCard.Header = PostCardHeader;
PostCard.Body = PostCardBody;
PostCard.Footer = PostCardFooter;
