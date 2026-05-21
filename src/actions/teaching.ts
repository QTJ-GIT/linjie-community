'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { tiptapToText } from '@/lib/tiptap-to-text';

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ── Validators ────────────────────────────────────────────────────────────

const videoSchema = z.object({
  type: z.literal('video'),
  title: z.string().min(2, '标题至少 2 字').max(200, '标题最多 200 字'),
  description: z.string().max(500, '简介最多 500 字').optional(),
  video_url: z.string().url('无效的视频地址').optional(),
  embed_url: z.string().url('无效的嵌入地址').optional(),
  thumbnail_url: z.string().url().optional(),
  cover_image_url: z.string().url().optional(),
  category: z.string().max(50).optional(),
});

const articleSchema = z.object({
  type: z.literal('article'),
  title: z.string().min(2, '标题至少 2 字').max(200, '标题最多 200 字'),
  description: z.string().max(500, '简介最多 500 字').optional(),
  body_json: z.record(z.unknown()),
  body_text: z.string().optional(),
  cover_image_url: z.string().url().optional(),
  category: z.string().max(50).optional(),
});

const createSchema = z.union([videoSchema, articleSchema]);

export type TeachingCreateInput = z.input<typeof createSchema>;

// ── Actions ───────────────────────────────────────────────────────────────

export async function createTeachingResource(
  input: TeachingCreateInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '输入无效' };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const base = {
    author_id: user.id,
    type: parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    cover_image_url: parsed.data.cover_image_url ?? null,
    category: parsed.data.category ?? null,
  };

  let row: Record<string, unknown>;
  if (parsed.data.type === 'video') {
    if (!parsed.data.video_url && !parsed.data.embed_url) {
      return { ok: false, error: '请上传视频文件或填写外部链接' };
    }
    row = {
      ...base,
      video_url: parsed.data.video_url ?? null,
      embed_url: parsed.data.embed_url ?? null,
      thumbnail_url: parsed.data.thumbnail_url ?? null,
    };
  } else {
    const bodyText = parsed.data.body_text ?? tiptapToText(parsed.data.body_json) ?? '';
    row = {
      ...base,
      body_json: parsed.data.body_json,
      body_text: bodyText,
    };
  }

  const { data, error } = await supabase
    .from('teaching_resources')
    .insert(row)
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  revalidatePath('/teaching');
  redirect(`/teaching/${data.id}`);
}

export async function deleteTeachingResource(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { error } = await supabase
    .from('teaching_resources')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('author_id', user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/teaching');
  return { ok: true };
}

export async function incrementTeachingViewCount(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.rpc('increment_teaching_view_count', { resource_id: id });
}

export async function adminDeleteTeachingResource(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.is_admin) return { ok: false, error: '无管理员权限' };

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { error } = await service
    .from('teaching_resources')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/teaching');
  revalidatePath('/admin/teaching');
  return { ok: true };
}
