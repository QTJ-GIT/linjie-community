import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SmartTime } from '@/components/smart-time';
import { Eye, Trash2, Plus } from 'lucide-react';
import { adminDeleteTeachingResource } from '@/actions/teaching';
import { SITE } from '@/lib/site';
import type { TeachingResourceWithAuthor } from '@/types/domain';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `教学管理 · ${SITE.name}`,
};

const CATEGORIES = [
  '股票入门',
  '技术分析',
  '基本面分析',
  '投资策略',
  '交易心理',
  '工具教程',
] as const;

function pickAuthor(raw: unknown) {
  if (Array.isArray(raw)) return raw[0] ?? { handle: 'unknown', display_name: '未知' };
  if (raw && typeof raw === 'object') return raw as { handle: string; display_name: string | null };
  return { handle: 'unknown', display_name: '未知' };
}

async function handleDelete(id: string) {
  'use server';
  await adminDeleteTeachingResource(id);
  redirect('/admin/teaching');
}

type SearchParams = { category?: string };

export default async function AdminTeachingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const categoryFilter = searchParams?.category || null;

  const supabase = createClient();

  let query = supabase
    .from('teaching_resources')
    .select(
      `id, type, title, category, view_count, created_at, is_deleted,
       author:profiles!teaching_resources_author_id_fkey ( id, handle, display_name )`
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (categoryFilter) {
    query = query.eq('category', categoryFilter);
  }

  const { data, error } = await query;

  const resources = (data ?? []) as unknown as (TeachingResourceWithAuthor & { is_deleted: boolean })[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">教学内容管理</h2>
        <Button asChild size="sm">
          <Link href="/admin/teaching/new">
            <Plus className="h-4 w-4 mr-1.5" />
            发布教学
          </Link>
        </Button>
      </div>

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/teaching"
          className={cn(
            'rounded-full px-3 py-1 text-xs transition-colors border',
            !categoryFilter
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
          )}
        >
          全部分类
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/admin/teaching?category=${encodeURIComponent(c)}`}
            className={cn(
              'rounded-full px-3 py-1 text-xs transition-colors border',
              categoryFilter === c
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
            )}
          >
            {c}
          </Link>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-destructive">加载失败：{error.message}</p>
      ) : resources.length === 0 ? (
        <p className="text-sm text-muted-foreground">还没有教学内容</p>
      ) : (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/30">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">类型</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">分类</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">标题</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">作者</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">浏览</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">时间</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {resources.map((r) => {
                const author = pickAuthor(r.author);
                return (
                  <tr key={r.id} className={r.is_deleted ? 'opacity-40' : ''}>
                    <td className="px-4 py-2.5">
                      <Badge variant={r.type === 'video' ? 'default' : 'secondary'} className="text-[11px]">
                        {r.type === 'video' ? '视频' : '文章'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      {r.category ? (
                        <Badge variant="outline" className="text-[11px]">{r.category}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <Link href={`/teaching/${r.id}`} className="hover:underline truncate block">
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      @{author.handle}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {r.view_count}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      <SmartTime iso={r.created_at} className="font-mono text-[10px]" />
                    </td>
                    <td className="px-4 py-2.5">
                      {!r.is_deleted && (
                        <form action={handleDelete.bind(null, r.id)}>
                          <button type="submit" className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/70">
                            <Trash2 className="h-3.5 w-3.5" /> 删除
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
