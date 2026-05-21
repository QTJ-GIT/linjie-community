'use client';

import * as React from 'react';
import Image from 'next/image';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createTeachingComment, deleteTeachingComment } from '@/actions/teaching-social';

interface Comment {
  id: string;
  author_id: string;
  body_text: string;
  created_at: string;
  author: {
    id: string;
    handle: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface TeachingCommentsProps {
  resourceId: string;
  comments: Comment[];
  currentUserId?: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(iso).toLocaleDateString('zh-CN');
}

export function TeachingComments({ resourceId, comments: initial, currentUserId }: TeachingCommentsProps) {
  const router = useRouter();
  const [comments, setComments] = React.useState<Comment[]>(initial);
  const [text, setText] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    if (!currentUserId) { toast.error('请先登录'); return; }
    setSubmitting(true);
    try {
      const res = await createTeachingComment(resourceId, text.trim());
      if (!res.ok) { toast.error(res.error); return; }
      setText('');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm('确定要删除这条评论？')) return;
    const res = await deleteTeachingComment(commentId, resourceId);
    if (!res.ok) { toast.error(res.error); return; }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    toast.success('评论已删除');
  }

  return (
    <section className="mt-8 space-y-6">
      <h2 className="text-base font-semibold text-foreground/80">
        评论 {comments.length > 0 ? `(${comments.length})` : ''}
      </h2>

      {/* 评论列表 */}
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">暂无评论，来说第一句话吧</p>
      ) : (
        <ul className="divide-y divide-border/40">
          {comments.map((c) => {
            const name = c.author?.display_name ?? c.author?.handle ?? '匿名';
            const initials = name.slice(0, 1);
            return (
              <li key={c.id} className="py-4 flex gap-3">
                <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-medium overflow-hidden">
                  {c.author?.avatar_url ? (
                    <Image src={c.author.avatar_url} alt={name} width={32} height={32} className="h-full w-full object-cover" unoptimized />
                  ) : (
                    initials
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium truncate">{name}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0" suppressHydrationWarning>{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-foreground/90 break-words">{c.body_text}</p>
                  {currentUserId === c.author_id && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="mt-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      删除
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* 输入框 */}
      {currentUserId ? (
        <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="写下你的评论…"
            maxLength={2000}
            rows={2}
            className="flex-1 resize-none rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="self-end rounded-lg bg-primary px-3 py-2 text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-2">
          <a href="/login" className="underline underline-offset-2">登录</a>后参与评论
        </p>
      )}
    </section>
  );
}
