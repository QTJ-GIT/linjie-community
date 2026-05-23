import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AttachPollForm } from './AttachPollForm';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: { id: string };
}

export default async function AttachPollPage({ params }: PageProps) {
  // 无效的 UUID 格式直接 404
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.id)) notFound();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/posts/${params.id}/poll`);

  const { data: post } = await supabase
    .from('posts')
    .select('id, author_id, title, is_deleted')
    .eq('id', params.id)
    .maybeSingle();
  if (!post || post.is_deleted) notFound();
  if (post.author_id !== user.id) redirect(`/posts/${params.id}`);

  const { data: existing } = await supabase
    .from('polls')
    .select('post_id')
    .eq('post_id', params.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href={`/posts/${params.id}`} className="hover:underline">
          ← 返回帖子
        </Link>
      </nav>
      <h1 className="mb-1 text-xl font-semibold">为帖子附加投票</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        《{post.title}》 · 仅作者可操作
      </p>

      {existing ? (
        <div className="rounded-md border bg-card p-4 text-sm">
          该帖子已存在投票。如需更改，请先删除原投票。
        </div>
      ) : (
        <AttachPollForm postId={params.id} />
      )}
    </div>
  );
}
