'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PollEditor, type PollDraft } from '@/components/polls/PollEditor';
import { createPollForPost } from '@/actions/polls';

export function AttachPollForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState<PollDraft | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit() {
    if (!draft) {
      toast.error('请先勾选「附加投票」并填写选项');
      return;
    }
    const opts = draft.options.map((o) => o.trim()).filter(Boolean);
    if (opts.length < 2) {
      toast.error('至少需要 2 个选项');
      return;
    }
    startTransition(async () => {
      const res = await createPollForPost({
        postId,
        multiple: draft.multiple,
        closes_at: draft.closes_at,
        options: opts,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('投票已附加');
      router.push(`/posts/${postId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <PollEditor value={{ multiple: false, closes_at: null, options: ['', ''] }} onChange={setDraft} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => history.back()} disabled={pending}>
          取消
        </Button>
        <Button type="button" onClick={onSubmit} disabled={pending}>
          {pending ? '保存中…' : '保存投票'}
        </Button>
      </div>
    </div>
  );
}
