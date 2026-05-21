'use client';

import { useEffect, useRef } from 'react';

/**
 * Observes a sentinel div and invokes onLoadMore when it scrolls into view.
 * Used by chat MessageList to load older history as the user scrolls up.
 */
export function useInfiniteScrollChat({
  hasMore,
  loading,
  onLoadMore,
}: {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}) {
  const triggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = triggerRef.current;
    if (!el || !hasMore || loading) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) onLoadMore();
      },
      { rootMargin: '50px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, onLoadMore]);

  return { triggerRef };
}
