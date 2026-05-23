import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { FeedList, type FeedSortKey } from '@/components/posts/FeedList';
import { PostListSkeleton } from '@/components/posts/PostListSkeleton';
import { Button } from '@/components/ui/button';
import { fetchAllSections } from '@/lib/sections';
import { cn } from '@/lib/utils';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

const SORTS: { key: FeedSortKey; label: string }[] = [
  { key: 'hot', label: '热门' },
  { key: 'new', label: '最新' },
  { key: 'top', label: '高分' },
  { key: 'discussed', label: '讨论多' },
];

function parseSort(v: string | undefined): FeedSortKey {
  if (v === 'new' || v === 'top' || v === 'discussed' || v === 'hot') return v;
  return 'hot';
}

export async function generateMetadata({
  params,
}: {
  params: { section: string };
}): Promise<Metadata> {
  const sections = await fetchAllSections();
  const section = sections.find((s) => s.slug === params.section);
  if (!section) {
    return { title: `分区 · ${SITE.name}` };
  }
  const title = `${section.name} · ${SITE.name}`;
  const url = `${SITE.url}/s/${params.section}`;
  return {
    title,
    description: section.description ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: section.description ?? undefined,
      url,
      type: 'website',
      siteName: SITE.name,
      locale: SITE.locale,
    },
    twitter: { card: 'summary_large_image', title, description: section.description ?? undefined },
  };
}

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: { section: string };
  searchParams?: { sort?: string };
}) {
  const sections = await fetchAllSections();
  const section = sections.find((s) => s.slug === params.section);
  if (!section) notFound();

  const sectionSlug = params.section;
  const sort = parseSort(searchParams?.sort);

  // Only fetch the viewer for the header CTA; actual list streams in via <Suspense>.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{section.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
        </div>
        {user ? (
          <Button asChild size="sm">
            <Link href={`/posts/new?section=${sectionSlug}`}>发新帖</Link>
          </Button>
        ) : null}
      </div>

      <nav className="flex items-center gap-1 border-b">
        {SORTS.map((s) => {
          const active = s.key === sort;
          return (
            <Link
              key={s.key}
              href={`/s/${sectionSlug}?sort=${s.key}`}
              className={cn(
                'relative px-3 py-2 text-sm transition-colors',
                active
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {s.label}
              {active ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <Suspense key={`${sectionSlug}:${sort}`} fallback={<PostListSkeleton />}>
        <FeedList sort={sort} sectionSlug={sectionSlug} />
      </Suspense>
    </div>
  );
}
