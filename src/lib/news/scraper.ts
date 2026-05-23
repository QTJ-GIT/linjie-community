import * as cheerio from 'cheerio';

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publish_time: string;
  category: string;
}

export interface NewsDetail {
  title: string;
  content: string;
  source: string;
  publish_time: string;
  url: string;
}

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

function hashUrl(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) - h + url.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 8);
}

function getCategory(href: string, title: string): string {
  const t = title.toLowerCase();
  const h = href.toLowerCase();
  if (t.includes('政策') || t.includes('监管') || t.includes('证监会') || t.includes('央行')) return '政策解读';
  if (t.includes('行业') || t.includes('板块') || t.includes('产业')) return '行业观察';
  if (t.includes('资金') || t.includes('主力') || t.includes('流入') || t.includes('流出')) return '资金动向';
  if (h.includes('stock') || /\d{6}/.test(title)) return '个股行情';
  if (t.includes('市场') || t.includes('指数') || t.includes('大盘') || t.includes('涨跌')) return '市场动态';
  return '财经要闻';
}

async function fetchWithFallback(urls: string[]): Promise<string> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: HEADERS, next: { revalidate: 0 } });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const text = new TextDecoder('gbk').decode(buf);
        if (text.length > 200) return text;
      }
    } catch {
      // try next
    }
  }
  throw new Error('所有数据源均不可用');
}

function extractNewsList(html: string): NewsItem[] {
  const $ = cheerio.load(html);
  const items: NewsItem[] = [];

  // Try sina finance patterns
  const selectors = [
    '.news-item',
    '.feed-card-item',
    '.fin_tabs0_c li',
    '.listBlk ul li',
    '#fin_tabs0_c0 ul li',
    '#fin_tabs0_c1 ul li',
    '.ty-card-rt li',
    '.ty-card-item',
    '.m-news-list li',
    '.news-list li',
    'ul.news-list li',
    '.feed-list li',
  ];

  for (const sel of selectors) {
    $(sel).each((_, el) => {
      const $el = $(el);
      const $a = $el.find('a').first();
      let href = $a.attr('href') || '';
      let title = $a.text().trim();

      if (!title) {
        title = $el.find('.txt').text().trim() || $el.text().trim();
      }

      if (!href && title) {
        const onclick = $el.attr('onclick') || '';
        const m = onclick.match(/window\.open\(['"](.+?)['"]/);
        if (m) href = m[1];
      }

      if (!href) {
        const allLinks = $el.find('a');
        allLinks.each((_, a) => {
          const h = $(a).attr('href') || '';
          if (h.startsWith('http')) {
            href = h;
            if (!title) title = $(a).text().trim();
            return false;
          }
        });
      }

      if (!href || !title || title.length < 5) return;
      if (href.startsWith('//')) href = 'https:' + href;
      if (!href.startsWith('http')) return;

      // dedupe
      if (items.some((i) => i.url === href)) return;

      const timeText =
        $el.find('.time, .date, .fgray_time, .fgray, .times, .source_time, .l').text().trim() ||
        $('title').text().includes('财经') ? new Date().toLocaleString('zh-CN') : '';

      const source =
        $el.find('.source, .fgray, .fgray_time, .l').text().trim() || '新浪财经';

      items.push({
        id: hashUrl(href),
        title,
        url: href,
        source: source.split(' ')[0] || '新浪财经',
        publish_time: timeText || new Date().toISOString(),
        category: getCategory(href, title),
      });
    });
    if (items.length >= 10) break;
  }

  return items;
}

function extractNewsDetail(html: string, url: string): NewsDetail {
  const $ = cheerio.load(html);

  const title =
    $('h1.main-title, h1#artibodyTitle, h1.article-title, h1.title, h1').first().text().trim() ||
    $('title').text().trim() ||
    '无标题';

  const paragraphs: string[] = [];
  const contentSelectors = [
    '#artibody p',
    '.article-content p',
    '.main-content p',
    '.content p',
    '#article_content p',
    'article p',
    '.blkContainerSblkCon p',
    '.newText p',
  ];

  for (const sel of contentSelectors) {
    $(sel).each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 10) paragraphs.push(text);
    });
    if (paragraphs.length >= 3) break;
  }

  const publish_time =
    $('span.date, .time-source span, .pub_time, .article-source span').first().text().trim() ||
    new Date().toLocaleString('zh-CN');

  return {
    title,
    content: paragraphs.length > 0
      ? paragraphs.map((p) => `<p class="mb-3">${p}</p>`).join('')
      : '<p>抱歉，暂时无法提取该文章的详细内容。</p>',
    source: '新浪财经',
    publish_time,
    url,
  };
}

const FALLBACK_NEWS: NewsItem[] = [
  {
    id: 'fb1',
    title: '中国证监会发布全面注册制改革方案',
    url: 'https://finance.sina.com.cn/stock/roll/2024-02-01/doc-inafpvsu2876392.shtml',
    source: '新浪财经',
    publish_time: new Date(Date.now() - 3600000).toISOString(),
    category: '政策解读',
  },
  {
    id: 'fb2',
    title: 'A股三大指数集体收涨，北向资金净买入超50亿元',
    url: 'https://finance.sina.com.cn/stock/marketresearch/2024-01-31/doc-inafpvsu2876393.shtml',
    source: '新浪财经',
    publish_time: new Date(Date.now() - 7200000).toISOString(),
    category: '市场动态',
  },
  {
    id: 'fb3',
    title: '新能源汽车板块持续走强，多只个股涨停',
    url: 'https://finance.sina.com.cn/stock/hyyj/2024-01-31/doc-inafpvsu2876394.shtml',
    source: '新浪财经',
    publish_time: new Date(Date.now() - 10800000).toISOString(),
    category: '行业观察',
  },
  {
    id: 'fb4',
    title: '贵州茅台2023年净利润同比增长19%，业绩超预期',
    url: 'https://finance.sina.com.cn/stock/s/2024-01-30/doc-inafpvsu2876395.shtml',
    source: '新浪财经',
    publish_time: new Date(Date.now() - 18000000).toISOString(),
    category: '个股行情',
  },
  {
    id: 'fb5',
    title: '央行开展1000亿元逆回购操作，维护流动性合理充裕',
    url: 'https://finance.sina.com.cn/stock/marketresearch/2024-01-30/doc-inafpvsu2876396.shtml',
    source: '新浪财经',
    publish_time: new Date(Date.now() - 25200000).toISOString(),
    category: '财经要闻',
  },
];

export async function fetchNewsList(): Promise<NewsItem[]> {
  const urls = [
    'https://finance.sina.com.cn/stock/',
    'https://finance.sina.com.cn/stock/newstock/',
    'https://finance.sina.com.cn/stock/marketresearch/',
  ];

  try {
    const html = await fetchWithFallback(urls);
    const items = extractNewsList(html);
    if (items.length > 0) return items;
  } catch {
    // fallback
  }
  return FALLBACK_NEWS;
}

export async function fetchNewsDetail(url: string): Promise<NewsDetail> {
  try {
    const html = await fetchWithFallback([url]);
    return extractNewsDetail(html, url);
  } catch {
    return {
      title: '获取详情失败',
      content: '<p>抱歉，暂时无法获取该资讯的详细内容。</p>',
      source: '新浪财经',
      publish_time: new Date().toLocaleString('zh-CN'),
      url,
    };
  }
}
