'use client';

import { useEffect, useState } from 'react';

/**
 * useLastVisited —— 客户端 localStorage 持久化"上次访问时间"，
 * 用于在 feed 中给上次访问后的新内容打"未读"视觉标记。
 *
 * @param scope 命名空间，例如 'feed'、'feed:stocks'，避免不同列表互相影响
 * @returns lastVisitedAt：挂载前为 null（避免 SSR 误判），挂载后读到上次值
 *
 * 注意：本 hook 不是 reactive 的"事实来源"——它只在挂载时读一次，
 * 然后在卸载或显式调用 markVisited 时写回，避免每次渲染都触发 storage I/O。
 */
export function useLastVisited(scope: string): {
  lastVisitedAt: string | null;
  markVisited: () => void;
} {
  const key = `lastVisitedAt:${scope}`;
  const [lastVisitedAt, setLastVisitedAt] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const v = window.localStorage.getItem(key);
      setLastVisitedAt(v);
    } catch {
      // storage may be unavailable (private mode, quota); silently ignore
    }
  }, [key]);

  const markVisited = () => {
    try {
      window.localStorage.setItem(key, new Date().toISOString());
    } catch {
      // ignore
    }
  };

  return { lastVisitedAt, markVisited };
}
