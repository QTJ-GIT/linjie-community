'use client';

import { useEffect, useRef } from 'react';

/**
 * 轻量键盘快捷键 Hook。
 * - 支持 "cmd+k" / "ctrl+k" / "?" / "/" 等单键
 * - 支持 "g f"（序列按键，间隔 <1.2s）
 * - 用户正在 input/textarea/contenteditable 时不触发（除非 allowInInput=true）
 */
export type HotkeyMap = Record<string, (e: KeyboardEvent) => void>;

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

function normalizeKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey) parts.push('cmd');
  if (e.ctrlKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey && e.key.length > 1) parts.push('shift');
  const k = e.key.toLowerCase();
  parts.push(k);
  return parts.join('+');
}

export function useHotkeys(map: HotkeyMap, opts?: { allowInInput?: boolean }) {
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    let seqPrefix = '';
    let seqTimer: ReturnType<typeof setTimeout> | null = null;

    const handler = (e: KeyboardEvent) => {
      if (!opts?.allowInInput && isTypingTarget(e.target)) return;
      const key = normalizeKey(e);
      // 单键 / 组合键
      const direct = mapRef.current[key] ?? mapRef.current[e.key];
      if (direct) {
        direct(e);
        seqPrefix = '';
        if (seqTimer) clearTimeout(seqTimer);
        return;
      }
      // 序列键：g f / g t ...
      if (seqPrefix) {
        const seqKey = `${seqPrefix} ${e.key.toLowerCase()}`;
        const seqFn = mapRef.current[seqKey];
        seqPrefix = '';
        if (seqTimer) clearTimeout(seqTimer);
        if (seqFn) {
          seqFn(e);
          return;
        }
      }
      // 记录前缀
      if (/^[a-z]$/.test(e.key.toLowerCase()) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const prefixKeys = Object.keys(mapRef.current)
          .filter((k) => k.includes(' '))
          .map((k) => k.split(' ')[0]);
        if (prefixKeys.includes(e.key.toLowerCase())) {
          seqPrefix = e.key.toLowerCase();
          if (seqTimer) clearTimeout(seqTimer);
          seqTimer = setTimeout(() => {
            seqPrefix = '';
          }, 1200);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (seqTimer) clearTimeout(seqTimer);
    };
  }, [opts?.allowInInput]);
}
