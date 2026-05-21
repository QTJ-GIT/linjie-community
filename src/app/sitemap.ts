import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { SITE } from '@/lib/site';

export const revalidate = 3600; // refresh hourly

const STATIC_PATHS: { path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/', changeFrequency: 'hourly', priority: 1.0 },
  { path: '/feed', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/s/general', changeFrequency: 'hourly', priority: 0.8 },
  { path: '/s/qa', changeFrequency: 'hourly', priority: 0.8 },
  { path: '/s/stocks', changeFrequency: 'hourly', priority: 0.8 },
  { path: '/tickers', changeFrequency: 'daily', priority: 0.7 },
  { path: '/trending', changeFrequency: 'hourly', priority: 0.8 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((s) => ({
    url: `${SITE.url}${s.path}`,
    lastModified: now,
    changeFrequency: s.changeFrequency,
    priority: s.priority,
  }));

  try {
    const supabase = createClient();

    const [{ data: posts }, { data: tickers }] = await Promise.all([
      supabase
        .from('posts')
        .select('id, updated_at, created_at')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase.from('tickers').select('symbol').limit(1000),
    ]);

    for (const p of (posts ?? []) as { id: string; updated_at: string; created_at: string }[]) {
      entries.push({
        url: `${SITE.url}/posts/${p.id}`,
        lastModified: new Date(p.updated_at ?? p.created_at),
        changeFrequency: 'weekly',
        priority: 0.6,
      });
    }

    for (const t of (tickers ?? []) as { symbol: string }[]) {
      entries.push({
        url: `${SITE.url}/tickers/${encodeURIComponent(t.symbol)}`,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 0.5,
      });
    }
  } catch {
    // fall back to static-only entries if Supabase query fails at build time
  }

  return entries;
}
