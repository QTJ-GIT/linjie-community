import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SmartTime } from '@/components/smart-time';
import type { PostWithAuthor } from '@/types/domain';

const SECTION_LABELS: Record<string, string> = {
  general: '综合讨论',
  qa: '问答',
  stocks: '股票话题',
};

export interface HeaderProps {
  post: Pick<
    PostWithAuthor,
    'author' | 'created_at' | 'section_slug' | 'type' | 'accepted_answer_id'
  >;
  showAvatar?: boolean;
  className?: string;
}

export function PostCardHeader({ post, showAvatar = true, className }: HeaderProps) {
  const isQuestion = post.type === 'question';
  const initials = (post.author.display_name ?? post.author.handle ?? '?').slice(0, 1);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground',
        className
      )}
    >
      {showAvatar ? (
        <Link href={`/profile/${post.author.handle}`} className="shrink-0">
          <Avatar className="h-5 w-5">
            {post.author.avatar_url ? (
              <AvatarImage src={post.author.avatar_url} alt={post.author.display_name} />
            ) : null}
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
        </Link>
      ) : null}
      <span className="font-medium text-foreground">{post.author.display_name}</span>
      <span className="font-mono text-[11px] text-muted-foreground/70">@{post.author.handle}</span>
      <span aria-hidden className="text-muted-foreground/40">·</span>
      <SmartTime iso={post.created_at} className="font-mono text-[11px]" />
      <span className="ml-1 inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        {SECTION_LABELS[post.section_slug] ?? post.section_slug}
      </span>
      {isQuestion ? (
        <Badge
          variant={post.accepted_answer_id ? 'default' : 'outline'}
          className="h-5 px-1.5 py-0 text-[10px]"
        >
          {post.accepted_answer_id ? '已解决' : '问题'}
        </Badge>
      ) : null}
    </div>
  );
}
