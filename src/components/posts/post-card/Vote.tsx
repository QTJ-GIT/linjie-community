import { VoteButtons } from '../VoteButtons';
import type { PostWithAuthor } from '@/types/domain';

export interface VoteProps {
  post: Pick<PostWithAuthor, 'id' | 'score' | 'my_vote'>;
  size?: 'sm' | 'default';
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

export function PostCardVote({
  post,
  size = 'sm',
  orientation = 'vertical',
  className,
}: VoteProps) {
  return (
    <VoteButtons
      targetType="post"
      targetId={post.id}
      initialScore={post.score ?? 0}
      initialMyVote={post.my_vote ?? 0}
      size={size}
      orientation={orientation}
      className={className}
    />
  );
}
