import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/site';

export const runtime = 'edge';
export const alt = `${SITE.name} — ${SITE.description}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          color: '#fff',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
          backgroundImage:
            'linear-gradient(135deg, #020617 0%, #1e1b4b 55%, #4338ca 100%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background:
                'linear-gradient(135deg, #a78bfa 0%, #6366f1 50%, #22d3ee 100%)',
              fontSize: 32,
              fontWeight: 800,
              color: '#0f172a',
            }}
          >
            临
          </div>
          <div style={{ fontSize: 28, opacity: 0.85, letterSpacing: 2 }}>
            LINJIE · COMMUNITY
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 120, fontWeight: 800, lineHeight: 1.05 }}>
            {SITE.name}
          </div>
          <div style={{ fontSize: 40, opacity: 0.85, maxWidth: 960 }}>
            {SITE.description}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 26,
            opacity: 0.7,
          }}
        >
          <span>讨论 · 问答 · 股票话题</span>
          <span>{SITE.url.replace(/^https?:\/\//, '')}</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
