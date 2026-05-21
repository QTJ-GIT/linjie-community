import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { FeedList, type FeedSortKey } from '@/components/posts/FeedList';
import { PostListSkeleton } from '@/components/posts/PostListSkeleton';
import { Button } from '@/components/ui/button';
import { SECTION_SLUGS, type SectionSlug } from '@/lib/validators/post';
import { cn } from '@/lib/utils';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

const SECTION_LABELS: Record<SectionSlug, { name: string; description: string }> = {
  general: { name: '综合讨论', description: '开放式交流' },
  qa: { name: '问答', description: '提问与作答' },
  stocks: { name: '股票话题', description: '股票相关讨论' },
};

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

function isSectionSlug(v: string): v is SectionSlug {
  return (SECTION_SLUGS as readonly string[]).includes(v);
}

export async function generateMetadata({
  params,
}: {
  params: { section: string };
}): Promise<Metadata> {
  if (!isSectionSlug(params.section)) {
    return { title: `分区 · ${SITE.name}` };
  }
  const meta = SECTION_LABELS[params.section];
  const title = `${meta.name} · ${SITE.name}`;
  const url = `${SITE.url}/s/${params.section}`;
  return {
    title,
    description: meta.description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: meta.description,
      url,
      type: 'website',
      siteName: SITE.name,
      locale: SITE.locale,
    },
    twitter: { card: 'summary_large_image', title, description: meta.description },
  };
}

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: { section: string };
  searchParams?: { sort?: string };
}) {
  if (!isSectionSlug(params.section)) notFound();
  const sectionSlug = params.section;
  const meta = SECTION_LABELS[sectionSlug];
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
          <h1 className="text-2xl font-semibold">{meta.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
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
