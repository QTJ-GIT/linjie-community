'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type MentionItem = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
};

export interface MentionListHandle {
  onKeyDown: (e: { event: KeyboardEvent }) => boolean;
}

export interface MentionListProps {
  items: MentionItem[];
  command: (payload: { id: string; label: string }) => void;
}

export const MentionList = React.forwardRef<MentionListHandle, MentionListProps>(
  function MentionList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    React.useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const selectItem = React.useCallback(
      (index: number) => {
        const item = items[index];
        if (!item) return;
        command({ id: item.handle, label: item.handle });
      },
      [items, command]
    );

    const upHandler = React.useCallback(() => {
      setSelectedIndex((i) => (items.length === 0 ? 0 : (i + items.length - 1) % items.length));
    }, [items.length]);

    const downHandler = React.useCallback(() => {
      setSelectedIndex((i) => (items.length === 0 ? 0 : (i + 1) % items.length));
    }, [items.length]);

    const enterHandler = React.useCallback(() => {
      selectItem(selectedIndex);
    }, [selectItem, selectedIndex]);

    React.useImperativeHandle(
      ref,
      () => ({
        onKeyDown: ({ event }) => {
          if (event.key === 'ArrowUp') {
            upHandler();
            return true;
          }
          if (event.key === 'ArrowDown') {
            downHandler();
            return true;
          }
          if (event.key === 'Enter') {
            enterHandler();
            return true;
          }
          return false;
        },
      }),
      [upHandler, downHandler, enterHandler]
    );

    if (items.length === 0) {
      return (
        <div className="w-56 rounded-md border border-border bg-popover p-2 text-xs text-muted-foreground shadow-md">
          没有匹配的用户
        </div>
      );
    }

    return (
      <div className="w-64 overflow-hidden rounded-md border border-border bg-popover p-1 text-sm shadow-md">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectItem(index)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={cn(
              'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left',
              index === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/60'
            )}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs">
              {item.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.avatar_url}
                  alt={item.display_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                (item.display_name ?? item.handle ?? '?').slice(0, 1)
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{item.display_name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                @{item.handle}
              </span>
            </span>
          </button>
        ))}
      </div>
    );
  }
);
