'use client';

import { useEffect, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

type PgEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface UseRealtimeChannelOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  channel: string;
  table: string;
  schema?: string;
  event?: PgEvent;
  filter?: string;
  onChange: (payload: RealtimePostgresChangesPayload<T>) => void;
}

/**
 * Generic Supabase Realtime subscription hook.
 * Subscribes to postgres_changes on the specified channel/table/filter.
 * Automatically unsubscribes on unmount or when dependencies change.
 */
export function useRealtimeChannel<T extends Record<string, unknown> = Record<string, unknown>>(
  options: UseRealtimeChannelOptions<T>
) {
  const { channel, table, schema = 'public', event = '*', filter, onChange } = options;
  const handlerRef = useRef(onChange);
  handlerRef.current = onChange;

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(channel)
      .on(
        'postgres_changes',
        { event, schema, table, ...(filter ? { filter } : {}) },
        (payload) => {
          handlerRef.current(payload as RealtimePostgresChangesPayload<T>);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [channel, table, schema, event, filter]);
}
