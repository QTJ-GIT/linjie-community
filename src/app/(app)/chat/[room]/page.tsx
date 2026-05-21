import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ChatRoom } from '@/components/chat/ChatRoom';
import { createClient } from '@/lib/supabase/server';
import type { ChatMessageWithAuthor, ChatRoom as ChatRoomRow } from '@/types/domain';

interface PageProps {
  params: { room: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const roomSlug = decodeURIComponent(params.room);
  return { title: `${roomSlug} · 聊天室 · 临介社区` };
}

export const dynamic = 'force-dynamic';

export default async function ChatRoomPage({ params }: PageProps) {
  const roomSlug = decodeURIComponent(params.room);
  const supabase = createClient();

  const { data: room } = await supabase
    .from('chat_rooms')
    .select('slug, name, kind, ref_symbol')
    .eq('slug', roomSlug)
    .maybeSingle();

  if (!room) notFound();

  const typedRoom = room as ChatRoomRow;

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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-6">
      <nav
        aria-label="面包屑"
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Link href="/feed" className="hover:text-foreground">
          首页
        </Link>
        <ChevronRight className="h-3 w-3 opacity-60" />
        <span className="text-foreground/70">聊天室</span>
      </nav>
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-h2 font-semibold tracking-tight">{typedRoom.name}</h1>
        <Badge variant="secondary" className="h-6 px-2 py-0 text-[11px] font-medium">
          {typedRoom.kind === 'ticker' ? '股票' : '大厅'}
        </Badge>
        {typedRoom.ref_symbol ? (
          <Link
            href={`/tickers/${encodeURIComponent(typedRoom.ref_symbol)}`}
            className="text-sm text-[hsl(var(--brand-600))] underline-offset-4 hover:underline dark:text-[hsl(var(--brand-400))]"
          >
            查看 ${typedRoom.ref_symbol} 详情
          </Link>
        ) : null}
      </header>

      <ChatRoom
        roomSlug={typedRoom.slug}
        roomName={typedRoom.name}
        roomKind={typedRoom.kind}
        initialMessages={initialMessages}
        currentUserId={currentUserId}
      />
    </div>
  );
}
