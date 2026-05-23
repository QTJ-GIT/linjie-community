import { NextResponse } from 'next/server';
import { fetchNewsList } from '@/lib/news/scraper';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await fetchNewsList();
    return NextResponse.json({
      code: 0,
      msg: 'success',
      data,
      count: data.length,
      timestamp: Date.now(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        code: -1,
        msg: err instanceof Error ? err.message : '获取失败',
        data: [],
      },
      { status: 500 }
    );
  }
}
