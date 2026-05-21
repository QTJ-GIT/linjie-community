'use client';

import * as React from 'react';
import { PostCard } from '@/components/posts/PostCard';
import { BlurFade } from '@/components/transitions/BlurFade';
import { Button } from '@/components/ui/button';
import { loadMorePosts } from '@/actions/feed';
import type { PostWithAuthor, SectionSlug } from '@/types/domain';

export type SortKey = 'hot' | 'new' | 'top' | 'discussed';
export type ViewMode = 'card' | 'compact';

export interface LoadMoreProps {
  initialCursor: string | null;
  section?: SectionSlug;
  sort?: SortKey;
  mode?: ViewMode;
}

export function LoadMore({ initialCursor, section, sort = 'new', mode = 'card' }: LoadMoreProps) {
  const [cursor, setCursor] = React.useState<string | null>(initialCursor);
  const [posts, setPosts] = React.useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = React.useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await loadMorePosts({ cursor, section, sort });
      if (result.error) {
        setError(result.error);
        return;
      }
      setPosts((prev) => [...prev, ...result.posts]);
      setCursor(result.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, section, sort]);

  return (
    <>
      {posts.length > 0 ? (
        <div className={mode === 'compact' ? 'divide-y overflow-hidden rounded-md border bg-card' : 'space-y-3'}>
          {posts.map((p, i) => (
            <BlurFade key={p.id} delay={Math.min(i, 6) * 0.04}>
              <PostCard post={p} mode={mode} />
            </BlurFade>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="pt-2 text-center text-sm text-destructive">加载失败：{error}</p>
      ) : null}

      {cursor ? (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={handleClick} disabled={loading}>
            {loading ? '加载中…' : '加载更多'}
          </Button>
        </div>
      ) : null}
    </>
  );
}
