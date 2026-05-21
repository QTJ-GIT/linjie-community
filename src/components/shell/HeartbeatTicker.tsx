'use client';

import { useHeartbeat } from '@/hooks/useHeartbeat';

export function HeartbeatTicker() {
  useHeartbeat();
  return null;
}
