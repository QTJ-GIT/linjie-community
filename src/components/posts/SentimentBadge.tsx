import * as React from 'react';
import { cn } from '@/lib/utils';
import type { PostSentiment } from '@/types/domain';

export const SENTIMENT_LABELS: Record<PostSentiment, string> = {
  bull: '看多',
  bear: '看空',
  neutral: '中性',
  question: '提问',
  rant: '吐槽',
};

const SENTIMENT_CLASSES: Record<PostSentiment, string> = {
  bull: 'bg-emerald-500 text-white',
  bear: 'bg-rose-500 text-white',
  neutral: 'bg-zinc-500 text-white',
  question: 'bg-blue-500 text-white',
  rant: 'bg-amber-500 text-white',
};

export interface SentimentBadgeProps {
  sentiment: PostSentiment;
  className?: string;
}

export function SentimentBadge({ sentiment, className }: SentimentBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none',
        SENTIMENT_CLASSES[sentiment],
        className
      )}
    >
      {SENTIMENT_LABELS[sentiment]}
    </span>
  );
}
