import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { PostWithAuthor } from '@/types/domain';

export interface BodyProps {
  post: Pick<PostWithAuthor, 'id' | 'title' | 'body_text' | 'tickers'>;
  clamp?: 1 | 2;
  showTickers?: boolean;
  showBody?: boolean;
  titleClassName?: string;
  className?: string;
}

export function PostCardBody({
  post,
  clamp = 2,
  showTickers = true,
  showBody = true,
  titleClassName,
  className,
}: BodyProps) {
  return (
    <div className={className}>
      <Link
        href={`/posts/${post.id}`}
        className={cn(
          'block font-semibold leading-snug tracking-tight text-foreground transition-colors hover:text-[hsl(var(--brand-600))] dark:hover:text-[hsl(var(--brand-400))]',
          titleClassName
        )}
      >
        {post.title}
      </Link>
      {showBody ? (
        <p
          className={cn(
            'mt-1.5 whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-muted-foreground',
            clamp === 1 ? 'line-clamp-1' : 'line-clamp-2'
          )}
        >
          {post.body_text}
        </p>
      ) : null}
      {showTickers && post.tickers && post.tickers.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tickers.map((t) => (
            <Link
              key={t}
              href={`/tickers/${t}`}
              className={cn(
                'inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-tight transition-colors',
                'border-emerald-500/25 bg-emerald-500/8 text-emerald-700 hover:bg-emerald-500/15',
                'dark:border-emerald-400/30 dark:text-emerald-300 dark:hover:bg-emerald-400/15'
              )}
            >
              ${t}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
