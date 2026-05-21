'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/actions/profile';
import type { Profile } from '@/types/domain';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type MenuProfile = Pick<
  Profile,
  'id' | 'handle' | 'display_name' | 'avatar_url'
>;

export function UserMenu() {
  const [profile, setProfile] = useState<MenuProfile | null>(null);
  const [ready, setReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function loadProfile(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar_url')
        .eq('id', userId)
        .maybeSingle<MenuProfile>();
      if (!cancelled) {
        setProfile(data ?? null);
        setReady(true);
      }
    }

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user) {
        await loadProfile(user.id);
      } else {
        setProfile(null);
        setReady(true);
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!ready) {
    return <div className="h-10 w-20" aria-hidden />;
  }

  if (!profile) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">登录</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/signup">注册</Link>
        </Button>
      </div>
    );
  }

  const fallback =
    profile.display_name?.charAt(0) ?? profile.handle.charAt(0) ?? '?';

  function handleSignOut() {
    startTransition(async () => {
      try {
        await signOut();
      } catch (err) {
        // Next's redirect() throws a special error we should rethrow
        if (err && typeof err === 'object' && 'digest' in err) {
          throw err;
        }
        toast.error('退出失败', {
          description: err instanceof Error ? err.message : '未知错误',
        });
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="用户菜单"
        >
          <Avatar>
            {profile.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
            )}
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate text-sm">{profile.display_name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            @{profile.handle}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/profile/${profile.handle}`}>我的主页</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/profile/edit">编辑资料</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            handleSignOut();
          }}
          disabled={isPending}
        >
          {isPending ? '退出中…' : '退出登录'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserMenu;
