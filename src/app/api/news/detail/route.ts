import { NextResponse } from 'next/server';
import { fetchNewsDetail } from '@/lib/news/scraper';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { code: -1, msg: '缺少url参数', data: null },
      { status: 400 }
    );
  }

  try {
    const data = await fetchNewsDetail(url);
    return NextResponse.json({
      code: 0,
      msg: 'success',
      data,
    });
  } catch (err) {
    return NextResponse.json(
      {
        code: -1,
        msg: err instanceof Error ? err.message : '获取失败',
        data: {
          title: '获取详情失败',
          content: '<p>抱歉，暂时无法获取该资讯的详细内容。</p>',
          source: '新浪财经',
          publish_time: new Date().toLocaleString('zh-CN'),
          url,
        },
      },
      { status: 500 }
    );
  }
}
