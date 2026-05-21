'use client';

import { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PRESET_EMOJIS = ['👍', '❤️', '🚀', '🐂', '🐻', '🔥', '😂', '💀'] as const;

export interface ReactionPickerProps {
  onPick: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Simple absolute-positioned emoji picker. No Popover primitive required.
 */
export function ReactionPicker({ onPick, disabled, className }: ReactionPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        aria-label="添加表情"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-border bg-background px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
        )}
      >
        <SmilePlus className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="absolute bottom-full left-0 z-50 mb-2 flex gap-1 rounded-md border bg-popover p-2 shadow-md"
          >
            {PRESET_EMOJIS.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => {
                  setOpen(false);
                  onPick(e);
                }}
                className="rounded p-1 text-lg transition-transform hover:scale-125"
                aria-label={`使用 ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
