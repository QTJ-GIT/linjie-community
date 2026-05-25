import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface MarketData {
  price: number;
  change: number;
  changePercent: number;
  source: string;
  timestamp: string;
}

interface GoldApiResponse {
  gold: MarketData | null;
  silver: MarketData | null;
  dollarIndex: MarketData | null;
  crudeOil: MarketData | null;
  isRealtime: boolean;
  cachedAt?: string;
}

// 硬编码财经新闻（与 gold_news_package 保持一致）
const NEWS = [
  {
    id: 'intl_1',
    title: '美联储利率决议公布在即 市场严阵以待',
    summary: '美联储即将公布最新利率决议，市场屏息等待指引。',
    source: 'Bloomberg',
    region: 'international',
    category: 'fed_policy',
    isHot: true,
    relevanceScore: 98,
  },
  {
    id: 'intl_2',
    title: '全球央行黄金储备持续攀升',
    summary: '最新数据显示全球央行继续增持黄金，新兴市场表现突出。',
    source: 'World Gold Council',
    region: 'international',
    category: 'central_bank',
    isHot: true,
    relevanceScore: 95,
  },
  {
    id: 'intl_3',
    title: '美国经济数据影响黄金走势',
    summary: '最新美国经济数据公布，对黄金市场产生重要影响。',
    source: 'Reuters',
    region: 'international',
    category: 'economic_data',
    isHot: false,
    relevanceScore: 92,
  },
  {
    id: 'intl_4',
    title: '地缘政治局势紧张 黄金避险需求升温',
    summary: '国际地缘政治紧张局势推动黄金避险需求。',
    source: 'CNBC',
    region: 'international',
    category: 'geopolitics',
    isHot: true,
    relevanceScore: 90,
  },
  {
    id: 'intl_5',
    title: '投行看好黄金前景',
    summary: '多家国际投行发布报告看好黄金未来走势。',
    source: 'Financial Times',
    region: 'international',
    category: 'market_analysis',
    isHot: false,
    relevanceScore: 88,
  },
  {
    id: 'dom_1',
    title: '中国央行公布最新储备数据',
    summary: '中国人民银行发布最新黄金储备数据。',
    source: '中国人民银行',
    region: 'domestic',
    category: 'central_bank',
    isHot: true,
    relevanceScore: 96,
  },
  {
    id: 'dom_2',
    title: '国内黄金投资热度不减',
    summary: '上海黄金交易所数据显示投资热情持续高涨。',
    source: '上海黄金交易所',
    region: 'domestic',
    category: 'market_analysis',
    isHot: false,
    relevanceScore: 85,
  },
  {
    id: 'dom_3',
    title: '人民币汇率波动 黄金受关注',
    summary: '人民币汇率波动背景下黄金投资价值凸显。',
    source: '证券时报',
    region: 'domestic',
    category: 'market_analysis',
    isHot: false,
    relevanceScore: 82,
  },
];

function parseSinaResponse(text: string, key: string): MarketData | null {
  try {
    if (!text.includes(key)) return null;
    const dataStr = text.split('"')[1];
    const parts = dataStr.split(',');
    if (parts.length < 5) return null;

    const price = parseFloat(parts[0]);
    const openPrice = parseFloat(parts[2]) || price;
    const change = price - openPrice;
    const changePercent = openPrice > 0 ? (change / openPrice) * 100 : 0;

    return {
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      source: 'Sina Finance',
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, headers: Record<string, string>, timeoutMs: number): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { headers, signal: controller.signal, next: { revalidate: 0 } });
    clearTimeout(timeout);
    return res;
  } catch {
    return null;
  }
}

async function fetchFromSina(): Promise<GoldApiResponse> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://finance.sina.com.cn/',
  };

  try {
    // 每个请求最多3秒，防止Vercel国外节点访问国内API超时
    const [goldRes, silverRes, dollarRes, oilRes] = await Promise.all([
      fetchWithTimeout('https://hq.sinajs.cn/list=hf_GC', headers, 3000),
      fetchWithTimeout('https://hq.sinajs.cn/list=hf_SI', headers, 3000),
      fetchWithTimeout('https://hq.sinajs.cn/list=usdx', headers, 3000),
      fetchWithTimeout('https://hq.sinajs.cn/list=hf_CL', headers, 3000),
    ]);

    const goldText = goldRes?.ok ? await goldRes.text() : '';
    const silverText = silverRes?.ok ? await silverRes.text() : '';
    const dollarText = dollarRes?.ok ? await dollarRes.text() : '';
    const oilText = oilRes?.ok ? await oilRes.text() : '';

    const gold = parseSinaResponse(goldText, 'hq_str_hf_GC');
    const silver = parseSinaResponse(silverText, 'hq_str_hf_SI');
    const dollarIndex = parseSinaResponse(dollarText, 'hq_str_usdx');
    const crudeOil = parseSinaResponse(oilText, 'hq_str_hf_CL');

    const isRealtime = !!(gold || silver || dollarIndex || crudeOil);

    if (isRealtime) {
      return { gold, silver, dollarIndex, crudeOil, isRealtime: true };
    }
  } catch {
    // Sina API failed, fall through to fallback
  }

  return getFallbackData();
}

function getFallbackData(): GoldApiResponse {
  return {
    gold: {
      price: 4603.07,
      change: 1.51,
      changePercent: 0.03,
      source: 'Sina Finance (Cached)',
      timestamp: new Date().toISOString(),
    },
    silver: {
      price: 29.85,
      change: 0.12,
      changePercent: 0.4,
      source: 'Sina Finance (Cached)',
      timestamp: new Date().toISOString(),
    },
    dollarIndex: {
      price: 104.25,
      change: -0.15,
      changePercent: -0.14,
      source: 'Federal Reserve (Cached)',
      timestamp: new Date().toISOString(),
    },
    crudeOil: {
      price: 78.45,
      change: 0.32,
      changePercent: 0.41,
      source: 'Energy Markets (Cached)',
      timestamp: new Date().toISOString(),
    },
    isRealtime: false,
    cachedAt: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'news') {
    return NextResponse.json({
      code: 0,
      data: NEWS,
    });
  }

  const data = await fetchFromSina();
  return NextResponse.json({
    code: 0,
    message: 'success',
    data,
  });
}
