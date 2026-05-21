'use client';

import { useEffect } from 'react';
import { useLastVisited } from '@/hooks/useLastVisited';

export interface FeedVisitMarkerProps {
  scope?: string;
}

/**
 * Mounts in the feed page; on unmount (or page leave) writes the current time
 * to localStorage. This way, on next visit, posts newer than that timestamp
 * are highlighted as unread by UnreadStripe.
 *
 * We delay the mark write by ~30s after mount so that immediate refresh
 * doesn't bury fresh items as "read"; instead "read" means "you actually
 * looked at the feed for at least a few seconds".
 */
export function FeedVisitMarker({ scope = 'feed' }: FeedVisitMarkerProps) {
  const { markVisited } = useLastVisited(scope);
  useEffect(() => {
    const t = window.setTimeout(() => {
      markVisited();
    }, 30_000);
    const onHide = () => markVisited();
    window.addEventListener('beforeunload', onHide);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('beforeunload', onHide);
      markVisited();
    };
    // markVisited is stable (no state deps); intentionally omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
