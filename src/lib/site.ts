// Shared site configuration used by metadata, sitemap, robots, RSS, OG images, etc.

export const SITE = {
  name: '临介社区',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  description: '一个讨论、问答与股票话题并存的社区',
  locale: 'zh_CN',
} as const;

export function absoluteUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE.url}${clean}`;
}
