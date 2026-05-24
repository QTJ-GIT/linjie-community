'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  postCreateSchema,
  postUpdateSchema,
  type PostCreateInput,
  type PostUpdateInput,
} from '@/lib/validators/post';
import { tiptapToText } from '@/lib/tiptap-to-text';

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export async function createPost(
  input: PostCreateInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = postCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '输入无效' };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { title, body_json, section_slug, sentiment } = parsed.data;
  let { type, body_text } = parsed.data;

  // 验证 section 是否存在于数据库
  const { data: sectionExists } = await supabase
    .from('sections')
    .select('slug')
    .eq('slug', section_slug)
    .maybeSingle();
  if (!sectionExists) return { ok: false, error: '所选分区不存在' };

  // stocks section only allows 普通帖
  if (section_slug === 'stocks') type = 'post';

  // derive body_text from JSON to be safe (client should also send it, but trust DB trigger needs content)
  const derived = tiptapToText(body_json as unknown);
  if (derived && derived.length > 0) body_text = derived;

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: user.id,
      section_slug,
      type,
      title,
      body_json,
      body_text,
      sentiment: sentiment ?? null,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath('/feed');
  revalidatePath(`/s/${section_slug}`);
  redirect(`/posts/${data.id}`);
}

export async function updatePost(
  input: PostUpdateInput
): Promise<ActionResult<{ id: string }>> {
  const parsed = postUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '输入无效' };
  }
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { id, title, body_json, section_slug, sentiment } = parsed.data;
  let { type, body_text } = parsed.data;

  // 验证 section 是否存在于数据库（如果提供了）
  if (section_slug) {
    const { data: sectionExists } = await supabase
      .from('sections')
      .select('slug')
      .eq('slug', section_slug)
      .maybeSingle();
    if (!sectionExists) return { ok: false, error: '所选分区不存在' };
  }

  if (section_slug === 'stocks') type = 'post';

  if (body_json) {
    const derived = tiptapToText(body_json as unknown);
    if (derived) body_text = derived;
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title !== undefined) patch.title = title;
  if (body_json !== undefined) patch.body_json = body_json;
  if (body_text !== undefined) patch.body_text = body_text;
  if (section_slug !== undefined) patch.section_slug = section_slug;
  if (type !== undefined) patch.type = type;
  if (sentiment !== undefined) patch.sentiment = sentiment ?? null;

  const { error } = await supabase
    .from('posts')
    .update(patch)
    .eq('id', id)
    .eq('author_id', user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/feed');
  revalidatePath(`/posts/${id}`);
  if (section_slug) revalidatePath(`/s/${section_slug}`);
  redirect(`/posts/${id}`);
}

export async function deletePost(id: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc('delete_post', { post_id: id });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/feed');
  return { ok: true };
}
