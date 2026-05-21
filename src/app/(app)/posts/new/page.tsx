import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PostForm } from '@/components/posts/PostForm';
import { SECTION_SLUGS, type SectionSlug } from '@/lib/validators/post';

export const dynamic = 'force-dynamic';

function isSectionSlug(v: string | undefined): v is SectionSlug {
  return !!v && (SECTION_SLUGS as readonly string[]).includes(v);
}

export default async function NewPostPage({
  searchParams,
}: {
  searchParams?: { section?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/posts/new');

  const preset = isSectionSlug(searchParams?.section) ? (searchParams!.section as SectionSlug) : undefined;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold">发新帖</h1>
      <PostForm initial={{ section_slug: preset }} />
    </div>
  );
}
