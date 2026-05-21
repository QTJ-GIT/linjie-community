import { createClient } from '@/lib/supabase/server';
import { SITE } from '@/lib/site';

export const revalidate = 600; // 10 min

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function rfc822(iso: string): string {
  return new Date(iso).toUTCString();
}

function excerpt(text: string, max = 200): string {
  const s = (text ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export async function GET(): Promise<Response> {
  const supabase = createClient();

  const { data } = await supabase
    .from('posts')
    .select(
      `id, title, body_text, created_at, updated_at,
       author:profiles!posts_author_id_fkey ( handle, display_name )`
    )
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(30);

  type Row = {
    id: string;
    title: string;
    body_text: string | null;
    created_at: string;
    updated_at: string;
    author: unknown;
  };

  const posts = (data ?? []) as Row[];
  const lastBuildDate = posts[0]?.updated_at ?? posts[0]?.created_at ?? new Date().toISOString();

  const items = posts
    .map((p) => {
      const authorRaw = Array.isArray(p.author) ? p.author[0] : p.author;
      const author = (authorRaw ?? {}) as { handle?: string; display_name?: string };
      const link = `${SITE.url}/posts/${p.id}`;
      const creator = author.display_name || author.handle || '匿名';
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${rfc822(p.created_at)}</pubDate>
      <dc:creator>${escapeXml(creator)}</dc:creator>
      <description>${escapeXml(excerpt(p.body_text ?? '', 200))}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(SITE.name)}</title>
    <link>${escapeXml(SITE.url)}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${rfc822(lastBuildDate)}</lastBuildDate>
    <atom:link href="${escapeXml(`${SITE.url}/feed.xml`)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200',
    },
  });
}
