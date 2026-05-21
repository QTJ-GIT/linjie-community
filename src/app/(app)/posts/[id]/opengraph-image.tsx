import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';
import { SITE } from '@/lib/site';

export const runtime = 'edge';
export const alt = '临介社区帖子';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Sentiment = 'bull' | 'bear' | 'neutral' | 'watch' | null;

const GRADIENTS: Record<Exclude<Sentiment, null> | 'default', string> = {
  bull: 'linear-gradient(135deg, #022c22 0%, #047857 55%, #10b981 100%)',
  bear: 'linear-gradient(135deg, #3b0a14 0%, #9f1239 55%, #fb7185 100%)',
  neutral: 'linear-gradient(135deg, #0f172a 0%, #334155 55%, #94a3b8 100%)',
  watch: 'linear-gradient(135deg, #0f1123 0%, #3730a3 55%, #f59e0b 100%)',
  default: 'linear-gradient(135deg, #020617 0%, #1e1b4b 55%, #4338ca 100%)',
};

const SENTIMENT_LABEL: Record<Exclude<Sentiment, null>, string> = {
  bull: '看多',
  bear: '看空',
  neutral: '中性',
  watch: '观望',
};

function truncate(s: string, n: number): string {
  if (!s) return '';
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

export default async function PostOgImage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: post } = await supabase
    .from('posts')
    .select(
      `id, title, score, sentiment, author_id,
       author:profiles!posts_author_id_fkey ( handle, display_name ),
       post_tickers ( symbol )`
    )
    .eq('id', params.id)
    .maybeSingle();

  const title = (post?.title as string | undefined) ?? '临介社区';
  const score = (post?.score as number | undefined) ?? 0;
  const sentiment = (post?.sentiment as Sentiment) ?? null;
  const authorRaw = Array.isArray(post?.author) ? post!.author[0] : post?.author;
  const author = (authorRaw ?? {}) as { handle?: string; display_name?: string };
  const tickers = ((post?.post_tickers as { symbol: string }[] | undefined) ?? []).map(
    (t) => t.symbol
  );
  const firstTicker = tickers[0] ?? null;

  // Get karma from user_karma
  let karma = 0;
  if (post?.author_id) {
    const { data: karmaRow } = await supabase
      .from('user_karma')
      .select('karma')
      .eq('user_id', post.author_id)
      .maybeSingle();
    karma = ((karmaRow as { karma?: number } | null)?.karma as number | undefined) ?? 0;
  }

  const gradient = sentiment ? GRADIENTS[sentiment] : GRADIENTS.default;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          color: '#fff',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
          backgroundImage: gradient,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.15)',
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              临
            </div>
            <div style={{ fontSize: 26, opacity: 0.85 }}>{SITE.name}</div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {sentiment ? (
              <div
                style={{
                  padding: '8px 18px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.18)',
                  fontSize: 24,
                  fontWeight: 600,
                }}
              >
                {SENTIMENT_LABEL[sentiment]}
              </div>
            ) : null}
            {firstTicker ? (
              <div
                style={{
                  padding: '8px 18px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.25)',
                  fontSize: 24,
                  fontWeight: 700,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
              >
                ${firstTicker}
              </div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: '-webkit-box',
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: -1,
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            maxHeight: 200,
          }}
        >
          {truncate(title, 80)}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 28,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                background:
                  'linear-gradient(135deg, #fafafa 0%, #cbd5e1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#111827',
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {(author.display_name ?? author.handle ?? '?').slice(0, 1)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 600 }}>
                {author.display_name ?? '匿名用户'}
              </div>
              <div style={{ fontSize: 22, opacity: 0.75 }}>
                @{author.handle ?? 'unknown'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28, opacity: 0.9 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>得分</span>
              <span style={{ fontWeight: 700 }}>{score}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>声望</span>
              <span style={{ fontWeight: 700 }}>{karma}</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
