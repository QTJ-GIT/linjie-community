import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SmartTime } from '@/components/smart-time';
import type { CommentWithAuthor } from '@/types/domain';

export interface CommentMetaProps {
  comment: CommentWithAuthor;
  isAccepted: boolean;
  isCollapsed: boolean;
  hasChildren: boolean;
  childCount: number;
}

export function CommentMeta({
  comment,
  isAccepted,
  isCollapsed,
  hasChildren,
  childCount,
}: CommentMetaProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">
        {comment.author.display_name}
      </span>
      <span className="font-mono text-[11px] text-muted-foreground/70">@{comment.author.handle}</span>
      <span aria-hidden className="text-muted-foreground/40">·</span>
      <SmartTime iso={comment.created_at} className="font-mono text-[11px]" />
      {isAccepted ? (
        <Badge className="h-5 gap-0.5 bg-emerald-600 px-1.5 py-0 text-[10px] text-white hover:bg-emerald-600">
          <Check className="h-2.5 w-2.5" />
          已采纳
        </Badge>
      ) : null}
      {isCollapsed && hasChildren ? (
        <Badge variant="secondary" className="h-5 px-1.5 py-0 text-[10px]">
          {childCount} 条回复
        </Badge>
      ) : null}
    </div>
  );
}
