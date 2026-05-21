import type { Section, SectionTreeNode } from '@/types/domain';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { unstable_cache } from 'next/cache';

const SECTION_COLS = 'slug, name, description, parent_slug, sort_order';

/**
 * 走 RSC cookie-bound client 的拉取——RLS 路径，可在普通 server component 内用。
 * **不要**在 unstable_cache scope 内调本函数（cookies() 在 cache 内不允许）。
 */
export async function fetchAllSections(): Promise<Section[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('sections')
    .select(SECTION_COLS)
    .order('sort_order', { ascending: true });
  return (data ?? []) as Section[];
}

/**
 * 走 service-role admin client 的拉取——绕过 cookies 与 RLS，专为 unstable_cache 设计。
 * sections 表是公开元数据，service role 读它没有隐私问题。
 */
async function fetchAllSectionsPublic(): Promise<Section[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('sections')
    .select(SECTION_COLS)
    .order('sort_order', { ascending: true });
  return (data ?? []) as Section[];
}

export function buildSectionTree(flat: Section[]): SectionTreeNode[] {
  const byKey = new Map<string, SectionTreeNode>();
  for (const s of flat) byKey.set(s.slug, { ...s, children: [] });
  const roots: SectionTreeNode[] = [];
  for (const node of byKey.values()) {
    if (node.parent_slug && byKey.has(node.parent_slug)) {
      byKey.get(node.parent_slug)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// 缓存 5 分钟，sections 改动频率极低
export const getSectionTree = unstable_cache(
  async (): Promise<SectionTreeNode[]> => {
    const flat = await fetchAllSectionsPublic();
    return buildSectionTree(flat);
  },
  ['section-tree'],
  { revalidate: 300 }
);
