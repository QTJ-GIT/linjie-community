import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PostForm } from '@/components/posts/PostForm';
import type { PostSentiment } from '@/types/domain';
import type { SectionSlug } from '@/lib/validators/post';

export const dynamic = 'force-dynamic';

export default async function EditPostPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/posts/${params.id}/edit`);

  const { data: post, error } = await supabase
    .from('posts')
    .select('id, author_id, section_slug, type, title, body_json, body_text, is_deleted, sentiment')
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-destructive">加载失败：{error.message}</p>
      </div>
    );
  }
  if (!post || post.is_deleted) notFound();
  if (post.author_id !== user.id) redirect(`/posts/${params.id}`);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">编辑帖子</h1>
      <PostForm
        initial={{
          id: post.id,
          title: post.title,
          section_slug: post.section_slug as SectionSlug,
          type: post.type,
          body_json: post.body_json as Record<string, unknown>,
          body_text: post.body_text,
          sentiment: (post.sentiment as PostSentiment | null | undefined) ?? null,
        }}
      />
    </div>
  );
}
