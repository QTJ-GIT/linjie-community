import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json(
      { code: -1, msg: '缺少股票代码参数', data: null },
      { status: 400 }
    );
  }

  try {
    const url = `https://hq.sinajs.cn/list=${code}`;
    const res = await fetch(url, {
      headers: {
        Referer: 'https://finance.sina.com.cn',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      throw new Error('行情接口请求失败');
    }

    const buffer = await res.arrayBuffer();
    const text = new TextDecoder('gbk').decode(buffer);

    // Parse sinajs response: var hq_str_sh600519="贵州茅台,1678.00,...";
    const match = text.match(/var hq_str_\w+="([^"]*)";/);
    if (!match || !match[1]) {
      return NextResponse.json({
        code: 0,
        msg: 'success',
        data: { raw: text, parsed: null },
      });
    }

    const fields = match[1].split(',');
    const [name, open, close, current, high, low, , , volume, amount] = fields;

    const parsed = {
      code,
      name: name || code,
      open: parseFloat(open) || 0,
      close: parseFloat(close) || 0,
      current: parseFloat(current) || 0,
      high: parseFloat(high) || 0,
      low: parseFloat(low) || 0,
      volume: parseInt(volume) || 0,
      amount: parseFloat(amount) || 0,
      change: close ? (((parseFloat(current) - parseFloat(close)) / parseFloat(close)) * 100).toFixed(2) : '0.00',
    };

    return NextResponse.json({
      code: 0,
      msg: 'success',
      data: parsed,
    });
  } catch (err) {
    return NextResponse.json(
      {
        code: -1,
        msg: err instanceof Error ? err.message : '获取失败',
        data: null,
      },
      { status: 500 }
    );
  }
}
