import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronRight, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PostCard } from '@/components/posts/PostCard';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { FollowTickerButton } from '@/components/tickers/FollowTickerButton';
import { Spotlight } from '@/components/effects/Spotlight';
import { GradientMesh } from '@/components/effects/GradientMesh';
import { createClient } from '@/lib/supabase/server';
import { SITE } from '@/lib/site';
import type { ChatMessageWithAuthor, PostWithAuthor, Ticker } from '@/types/domain';

interface PageProps {
  params: { symbol: string };
}

const MARKET_LABEL: Record<Ticker['market'], string> = {
  US: '美股',
  CN: 'A股',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const symbol = decodeURIComponent(params.symbol).toUpperCase();
  const supabase = createClient();
  const { data: ticker } = await supabase
    .from('tickers')
    .select('symbol, name')
    .eq('symbol', symbol)
    .maybeSingle();

  const name = (ticker as { name?: string } | null)?.name ?? symbol;
  const title = `$${symbol} ${name} · ${SITE.name}`;
  const description = `关于 ${name} 的讨论与聊天室`;
  const url = `${SITE.url}/tickers/${encodeURIComponent(symbol)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: SITE.name,
      locale: SITE.locale,
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export const dynamic = 'force-dynamic';

// 静态占位 sparkline —— 真行情接入前用伪曲线避免空白
function PlaceholderSparkline() {
  return (
    <svg
      viewBox="0 0 120 36"
      className="h-9 w-[120px] text-[hsl(var(--brand-500))]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* TODO 接行情：替换为真实 OHLC sparkline */}
      <polyline points="0,28 12,22 24,26 36,18 48,21 60,12 72,15 84,8 96,14 108,6 120,10" />
    </svg>
  );
}

export default async function TickerDetailPage({ params }: PageProps) {
  const symbol = decodeURIComponent(params.symbol).toUpperCase();
  const supabase = createClient();

  const { data: ticker } = await supabase
    .from('tickers')
    .select('symbol, market, name')
    .eq('symbol', symbol)
    .maybeSingle();

  if (!ticker) notFound();

  // Posts mentioning this ticker
  const { data: postRows } = await supabase
    .from('posts')
    .select(
      `
      id, author_id, section_slug, type, title, body_json, body_text,
      accepted_answer_id, is_deleted, created_at, updated_at,
      author:profiles!posts_author_id_fkey(id, handle, display_name, avatar_url),
      post_tickers!inner(symbol)
      `
    )
    .eq('is_deleted', false)
    .eq('post_tickers.symbol', symbol)
    .order('created_at', { ascending: false })
    .limit(20);

  const posts = ((postRows ?? []) as unknown as PostWithAuthor[]).map((p) => ({
    ...p,
    tickers: [symbol],
  }));

  // Room
  const roomSlug = `ticker:${symbol}`;
  const { data: room } = await supabase
    .from('chat_rooms')
    .select('slug, name, kind, ref_symbol')
    .eq('slug', roomSlug)
    .maybeSingle();

  // Last 50 messages
  const { data: msgRows } = await supabase
    .from('chat_messages')
    .select(
      `id, room_slug, author_id, body, created_at,
       author:profiles!chat_messages_author_id_fkey(id, handle, display_name, avatar_url)`
    )
    .eq('room_slug', roomSlug)
    .order('created_at', { ascending: false })
    .limit(50);

  const initialMessages = ((msgRows ?? []) as unknown as ChatMessageWithAuthor[])
    .slice()
    .reverse();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;

  const { data: tickerFollowRow } = user
    ? await supabase
        .from('ticker_follows')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('symbol', symbol)
        .maybeSingle()
    : { data: null as null | { user_id: string } };

  return (
    <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
      <nav
        aria-label="面包屑"
        className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Link href="/feed" className="hover:text-foreground">
          首页
        </Link>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <Link href="/tickers" className="hover:text-foreground">
          股票
        </Link>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="font-mono text-foreground/70">${ticker.symbol}</span>
      </nav>

      {/* Spotlight + GradientMesh hero */}
      <Spotlight
        className="mb-6 rounded-2xl border border-border/60"
        radius={420}
        color="hsl(var(--brand-500) / 0.18)"
      >
        <div className="relative overflow-hidden rounded-2xl">
          <GradientMesh blur={70} className="opacity-50" />
          <div className="absolute inset-0 -z-10 bg-card/55 backdrop-blur-md" />
          <div className="relative flex flex-wrap items-start justify-between gap-6 p-6 md:p-8">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="h-6 border-white/30 bg-white/70 px-2 py-0 text-[11px] font-medium text-foreground backdrop-blur dark:border-white/10 dark:bg-white/10"
                >
                  {MARKET_LABEL[ticker.market as Ticker['market']]}
                </Badge>
              </div>
              <h1 className="font-mono text-display leading-none tracking-tight text-brand-gradient">
                ${ticker.symbol}
              </h1>
              <p className="mt-3 text-body-lg font-medium text-foreground/90">
                {ticker.name}
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <PlaceholderSparkline />
                <span className="font-mono">— · — · —</span>
              </div>
            </div>
            {user ? (
              <div className="shrink-0 self-start">
                <FollowTickerButton symbol={symbol} initiallyFollowing={!!tickerFollowRow} />
              </div>
            ) : null}
          </div>
        </div>
      </Spotlight>

      <Tabs defaultValue="discuss" className="w-full">
        <TabsList className="bg-muted/40">
          <TabsTrigger value="discuss">讨论</TabsTrigger>
          <TabsTrigger value="chat">聊天室</TabsTrigger>
        </TabsList>

        <TabsContent value="discuss" className="mt-4">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-12 text-center">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">还没有人讨论 ${ticker.symbol}</p>
              <Link
                href="/posts/new"
                className="text-sm text-[hsl(var(--brand-600))] underline-offset-4 hover:underline dark:text-[hsl(var(--brand-400))]"
              >
                发一个帖子
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <ChatRoom
            roomSlug={roomSlug}
            roomName={room?.name ?? `$${ticker.symbol} 聊天室`}
            roomKind={(room?.kind as 'global' | 'ticker') ?? 'ticker'}
            initialMessages={initialMessages}
            currentUserId={currentUserId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
