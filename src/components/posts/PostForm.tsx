'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TiptapEditorLazy as TiptapEditor } from '@/components/editor/TiptapEditorLazy';
import {
  postCreateSchema,
  SECTION_SLUGS,
  SENTIMENTS,
  type SectionSlug,
  type Sentiment,
} from '@/lib/validators/post';
import { createPost, updatePost } from '@/actions/posts';

type PostFormValues = {
  title: string;
  body_json: Record<string, unknown>;
  body_text: string;
  section_slug: SectionSlug;
  type: 'post' | 'question';
  sentiment: Sentiment | '';
};

const SECTION_LABELS: Record<SectionSlug, string> = {
  general: '综合讨论',
  qa: '问答',
  stocks: '股票话题',
};

const SENTIMENT_LABELS: Record<Sentiment, string> = {
  bull: '看多',
  bear: '看空',
  neutral: '中性',
  question: '提问',
  rant: '吐槽',
};

export interface PostFormInitial {
  id?: string;
  title?: string;
  section_slug?: SectionSlug;
  type?: 'post' | 'question';
  body_json?: Record<string, unknown> | null;
  body_text?: string;
  sentiment?: Sentiment | null;
}

export interface PostFormProps {
  initial?: PostFormInitial;
  lockedSection?: SectionSlug;
}

export function PostForm({ initial, lockedSection }: PostFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  const defaultSection: SectionSlug =
    lockedSection ?? initial?.section_slug ?? 'general';

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postCreateSchema) as unknown as import('react-hook-form').Resolver<PostFormValues>,
    defaultValues: {
      title: initial?.title ?? '',
      section_slug: defaultSection,
      type: initial?.type ?? 'post',
      body_json: (initial?.body_json as Record<string, unknown>) ?? {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
      body_text: initial?.body_text ?? '',
      sentiment: initial?.sentiment ?? '',
    },
  });

  const section = form.watch('section_slug');
  const [pending, startTransition] = React.useTransition();

  // stocks section forces type='post'
  React.useEffect(() => {
    if (section === 'stocks') {
      form.setValue('type', 'post');
    }
  }, [section, form]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const payload = {
        ...values,
        sentiment: values.sentiment === '' ? null : values.sentiment,
      };
      const res = isEdit
        ? await updatePost({ id: initial!.id as string, ...payload })
        : await createPost(payload);
      if (res && res.ok === false) {
        toast.error(res.error);
      }
      // On success, server action redirects — nothing to do here.
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">标题</Label>
        <Input
          id="title"
          placeholder="输入标题（3-200 字）"
          {...form.register('title')}
        />
        {form.formState.errors.title ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="section">分区</Label>
          <select
            id="section"
            disabled={Boolean(lockedSection)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
            {...form.register('section_slug')}
          >
            {SECTION_SLUGS.map((s) => (
              <option key={s} value={s}>
                {SECTION_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="type">类型</Label>
          <select
            id="type"
            disabled={section === 'stocks'}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-60"
            {...form.register('type')}
          >
            <option value="post">普通</option>
            {section !== 'stocks' ? <option value="question">问题</option> : null}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sentiment">情绪标签（可选）</Label>
        <select
          id="sentiment"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          {...form.register('sentiment')}
        >
          <option value="">无</option>
          {SENTIMENTS.map((s) => (
            <option key={s} value={s}>
              {SENTIMENT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label>正文</Label>
        <Controller
          control={form.control}
          name="body_json"
          render={({ field }) => (
            <TiptapEditor
              value={(field.value as Record<string, unknown>) ?? null}
              placeholder="请输入正文，可使用 $AAPL / $600519 插入股票标签"
              onChange={(json, text) => {
                field.onChange(json);
                form.setValue('body_text', text, { shouldValidate: true });
              }}
            />
          )}
        />
        {form.formState.errors.body_text ? (
          <p className="text-xs text-destructive">
            {form.formState.errors.body_text.message}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          取消
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isEdit ? '保存' : '发布'}
        </Button>
      </div>
    </form>
  );
}
