'use client';

import * as React from 'react';
import { Share2, Link as LinkIcon, ExternalLink, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { SITE } from '@/lib/site';

type ShareMenuProps = {
  postId: string;
  title: string;
  className?: string;
};

/**
 * Dropdown share menu for a post. Shows:
 *   复制链接 / 分享 (Web Share API, if available) / 在新标签打开
 * Kept as a self-contained client component so any parent (PostCard,
 * post detail header, etc.) can drop it in without extra wiring.
 */
export function ShareMenu({ postId, title, className }: ShareMenuProps) {
  const [canShare, setCanShare] = React.useState(false);

  React.useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanShare(true);
    }
  }, []);

  const url = `${SITE.url}/posts/${postId}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('链接已复制');
    } catch {
      toast.error('复制失败');
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url });
    } catch (err) {
      // AbortError when user cancels is expected — stay quiet.
      if ((err as { name?: string })?.name === 'AbortError') return;
      toast.error('分享失败');
    }
  }

  function openInNewTab() {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="分享"
          className={className}
        >
          <Share2 className="h-4 w-4" />
          <span className="sr-only">分享</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void copyLink(); }}>
          <LinkIcon className="mr-2 h-4 w-4" />
          复制链接
        </DropdownMenuItem>
        {canShare ? (
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void nativeShare(); }}>
            <Send className="mr-2 h-4 w-4" />
            分享…
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openInNewTab(); }}>
          <ExternalLink className="mr-2 h-4 w-4" />
          在新标签打开
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ShareMenu;
