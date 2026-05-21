import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { ShareMenu } from '../ShareMenu';
import { ReactionBar } from '@/components/reactions/ReactionBar';
import { ReportButton } from '@/components/reports/ReportButton';
import { SmartTime } from '@/components/smart-time';
import type { PostWithAuthor } from '@/types/domain';

export interface FooterProps {
  post: Pick<
    PostWithAuthor,
    'id' | 'title' | 'comment_count' | 'created_at' | 'last_activity_at' | 'last_replier'
  >;
  showReactions?: boolean;
  className?: string;
}

export function PostCardFooter({ post, showReactions = true, className }: FooterProps) {
  const showActivity =
    !!post.last_replier &&
    !!post.last_activity_at &&
    post.last_activity_at !== post.created_at;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" />
          <span className="inline-block min-w-[2ch] text-right font-mono tabular-nums">{post.comment_count ?? 0}</span>
        </span>
        {showActivity && post.last_replier && post.last_activity_at ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <SmartTime iso={post.last_activity_at} />
            <span aria-hidden className="text-muted-foreground/50">由</span>
            <Link
              href={`/profile/${post.last_replier.handle}`}
              className="font-mono hover:text-foreground hover:underline"
            >
              @{post.last_replier.handle}
            </Link>
          </span>
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          <ReportButton targetType="post" targetId={post.id} />
          <ShareMenu postId={post.id} title={post.title} />
        </div>
      </div>
      {showReactions ? (
        <div className="mt-2.5">
          <ReactionBar targetType="post" targetId={post.id} initialReactions={[]} />
        </div>
      ) : null}
    </div>
  );
}
