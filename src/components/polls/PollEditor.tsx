'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PollDraft {
  multiple: boolean;
  closes_at: string | null;
  options: string[];
}

export interface PollEditorProps {
  value?: PollDraft | null;
  onChange?: (draft: PollDraft | null) => void;
  /**
   * When true, exposes a hidden input name="poll" with JSON payload
   * so that a parent <form> can read the draft.
   */
  hiddenInputName?: string;
  className?: string;
}

const MAX_OPTIONS = 6;

export function PollEditor({ value, onChange, hiddenInputName, className }: PollEditorProps) {
  const [enabled, setEnabled] = useState<boolean>(Boolean(value));
  const [draft, setDraft] = useState<PollDraft>(
    value ?? { multiple: false, closes_at: null, options: ['', ''] },
  );

  // Propagate changes out
  useEffect(() => {
    if (!onChange) return;
    onChange(enabled ? draft : null);
  }, [enabled, draft, onChange]);

  function updateOption(idx: number, text: string) {
    setDraft((d) => ({ ...d, options: d.options.map((o, i) => (i === idx ? text : o)) }));
  }

  function addOption() {
    setDraft((d) =>
      d.options.length >= MAX_OPTIONS ? d : { ...d, options: [...d.options, ''] },
    );
  }

  function removeOption(idx: number) {
    setDraft((d) =>
      d.options.length <= 2 ? d : { ...d, options: d.options.filter((_, i) => i !== idx) },
    );
  }

  const payload = enabled
    ? JSON.stringify({
        multiple: draft.multiple,
        closes_at: draft.closes_at,
        options: draft.options.map((o) => o.trim()).filter(Boolean),
      })
    : '';

  return (
    <div className={cn('rounded-md border bg-card p-3', className)}>
      <label className="mb-2 flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input accent-primary"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        附加投票
      </label>

      {enabled ? (
        <div className="space-y-2">
          <div className="space-y-1.5">
            {draft.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`选项 ${i + 1}`}
                  maxLength={200}
                />
                {draft.options.length > 2 ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeOption(i)}
                    aria-label="删除选项"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          {draft.options.length < MAX_OPTIONS ? (
            <Button type="button" size="sm" variant="outline" onClick={addOption}>
              <Plus className="mr-1 h-4 w-4" /> 添加选项
            </Button>
          ) : null}

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={draft.multiple}
                onChange={(e) => setDraft((d) => ({ ...d, multiple: e.target.checked }))}
              />
              允许多选
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span>截止时间</span>
              <input
                type="datetime-local"
                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                value={draft.closes_at ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, closes_at: e.target.value || null }))
                }
              />
            </label>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">勾选后可为帖子附加一个投票（2 ~ 6 个选项）。</p>
      )}

      {hiddenInputName ? (
        <input type="hidden" name={hiddenInputName} value={payload} />
      ) : null}
    </div>
  );
}
