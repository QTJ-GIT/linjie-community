'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createComment } from '@/actions/comments';

export interface CommentFormProps {
  postId: string;
  parentId?: string | null;
  placeholder?: string;
  onDone?: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export function CommentForm({
  postId,
  parentId,
  placeholder = '写下你的评论…',
  onDone,
  onCancel,
  autoFocus,
}: CommentFormProps) {
  const router = useRouter();
  const [text, setText] = React.useState('');
  const [pending, startTransition] = React.useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    // Build a minimal Tiptap-compatible JSON doc
    const body_json = {
      type: 'doc',
      content: body.split(/\n\n+/).map((para) => ({
        type: 'paragraph',
        content: [{ type: 'text', text: para }],
      })),
    };
    startTransition(async () => {
      const res = await createComment({
        post_id: postId,
        parent_id: parentId ?? null,
        body_json,
        body_text: body,
      });
      if (res.ok) {
        setText('');
        router.refresh();
        onDone?.();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={3}
      />
      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            取消
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={pending || !text.trim()}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          发布
        </Button>
      </div>
    </form>
  );
}
