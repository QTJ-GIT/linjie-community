'use client';

import { useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Periodically calls the `touch_last_seen` RPC to update the current user's
 * `profiles.last_seen` timestamp. Skips beats while the tab is hidden, and
 * sends an immediate beat when the tab becomes visible again.
 *
 * Failures (unauthenticated, RPC missing, network) are silently ignored.
 */
export function useHeartbeat(intervalMs = 60_000): void {
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let cancelled = false;

    const beat = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        await supabase.rpc('touch_last_seen');
      } catch {
        // 静默：未登录或 RPC 不可用
      }
    };

    void beat();
    const id = window.setInterval(beat, intervalMs);

    const onVis = () => {
      if (!document.hidden && !cancelled) void beat();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [supabase, intervalMs]);
}
