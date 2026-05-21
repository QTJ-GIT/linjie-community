'use client';

import * as React from 'react';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

export interface VirtualListProps<T> {
  items: T[];
  getKey: (item: T, index: number) => string | number;
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  overscan?: number;
  className?: string;
  bottomRef?: React.Ref<HTMLDivElement>;
  scrollToBottomOnChange?: boolean;
}

/**
 * Generic virtualized list backed by @tanstack/react-virtual.
 *
 * Uses an internal scroll container (fixed height via caller-supplied className),
 * dynamic per-row measurement, and exposes a bottom sentinel ref so callers can
 * scroll to bottom on new items.
 */
export function VirtualList<T>({
  items,
  getKey,
  renderItem,
  estimateSize = 72,
  overscan = 8,
  className,
  bottomRef,
  scrollToBottomOnChange,
}: VirtualListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement | null>(null);

  const virtualizer: Virtualizer<HTMLDivElement, Element> = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: (index) => getKey(items[index]!, index) as string | number,
  });

  // Optional scroll-to-bottom when the item count changes (chat / dm).
  React.useEffect(() => {
    if (!scrollToBottomOnChange) return;
    const el = parentRef.current;
    if (!el) return;
    // Defer to after measurement.
    const raf = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(raf);
  }, [items.length, scrollToBottomOnChange]);

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      className={cn('relative w-full overflow-auto', className)}
    >
      <div
        style={{
          height: `${totalSize}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((vi) => {
          const item = items[vi.index]!;
          return (
            <div
              key={vi.key}
              ref={virtualizer.measureElement}
              data-index={vi.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vi.start}px)`,
              }}
            >
              {renderItem(item, vi.index)}
            </div>
          );
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
