'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ── Types ───────────────────────────────────────────────────────────────

export interface SupportSession {
  id: string;
  user_id: string | null;
  user_name: string;
  user_email: string | null;
  subject: string | null;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
  last_message?: string;
  unread_count?: number;
}

export interface SupportMessage {
  id: string;
  session_id: string;
  sender_type: 'user' | 'admin' | 'system';
  content: string;
  admin_id: string | null;
  created_at: string;
  admin_name?: string | null;
}

export interface SupportFAQ {
  id: string;
  keywords: string[];
  question: string;
  answer: string;
  sort_order: number;
}

// ── 1. 创建会话 ────────────────────────────────────────────────────────

export async function createSupportSession(input: {
  user_name?: string;
  user_email?: string;
  subject?: string;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('support_sessions')
    .insert({
      user_id: user?.id ?? null,
      user_name: input.user_name?.trim() || '匿名用户',
      user_email: input.user_email?.trim() || null,
      subject: input.subject?.trim() || null,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, sessionId: data.id };
}

// ── 2. 发送消息（用户端）────────────────────────────────────────────────

export async function sendSupportMessage(
  sessionId: string,
  content: string
) {
  const supabase = createClient();
  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: '消息不能为空' };

  // 1. 插入用户消息
  const { error: msgErr } = await supabase
    .from('support_messages')
    .insert({ session_id: sessionId, sender_type: 'user', content: trimmed });

  if (msgErr) return { ok: false, error: msgErr.message };

  // 2. 自动匹配 FAQ 回复
  const autoReply = await matchFAQ(supabase, trimmed);
  if (autoReply) {
    await supabase.from('support_messages').insert({
      session_id: sessionId,
      sender_type: 'system',
      content: `【自动回复】${autoReply}`,
    });
  }

  // 3. 更新会话时间
  await supabase
    .from('support_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  revalidatePath('/admin/support');
  return { ok: true };
}

// FAQ 关键词匹配
async function matchFAQ(supabase: ReturnType<typeof createClient>, content: string): Promise<string | null> {
  const { data: faqs } = await supabase
    .from('support_faqs')
    .select('keywords, answer')
    .eq('is_active', true);

  if (!faqs) return null;

  const lower = content.toLowerCase();
  for (const faq of faqs) {
    const keywords: string[] = faq.keywords ?? [];
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return faq.answer;
      }
    }
  }
  return null;
}

// ── 3. 获取 FAQ 列表 ────────────────────────────────────────────────────

export async function getSupportFAQs(): Promise<SupportFAQ[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('support_faqs')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return [];
  return data ?? [];
}

// ── 4. 获取会话消息 ────────────────────────────────────────────────────

export async function getSupportMessages(sessionId: string): Promise<SupportMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('support_messages')
    .select(`
      *,
      admin:profiles!support_messages_admin_id_fkey(handle)
    `)
    .eq('session_id', sessionId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) return [];
  return (data ?? []).map((m: unknown) => {
    const msg = m as SupportMessage & { admin?: { handle?: string } };
    return {
      ...msg,
      admin_name: msg.admin?.handle ?? null,
    };
  });
}

// ── 5. 管理员：获取所有会话 ─────────────────────────────────────────────

export async function getSupportSessions(): Promise<SupportSession[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // 校验管理员
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) return [];

  const { data, error } = await supabase
    .from('support_sessions')
    .select('*')
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false });

  if (error) return [];

  // 获取最后一条消息
  const sessions = data ?? [];
  for (const s of sessions) {
    const { data: msgs } = await supabase
      .from('support_messages')
      .select('content, sender_type')
      .eq('session_id', s.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (msgs) {
      (s as Record<string, unknown>).last_message = msgs.content;
    }
  }

  return sessions;
}

// ── 6. 管理员：回复消息 ─────────────────────────────────────────────────

export async function replySupportMessage(
  sessionId: string,
  content: string
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '未登录' };

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) return { ok: false, error: '无权操作' };

  const trimmed = content.trim();
  if (!trimmed) return { ok: false, error: '内容不能为空' };

  const { error } = await supabase.from('support_messages').insert({
    session_id: sessionId,
    sender_type: 'admin',
    content: trimmed,
    admin_id: user.id,
  });

  if (error) return { ok: false, error: error.message };

  await supabase
    .from('support_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  revalidatePath('/admin/support');
  return { ok: true };
}

// ── 7. 关闭会话 ────────────────────────────────────────────────────────

export async function closeSupportSession(sessionId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '未登录' };

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) return { ok: false, error: '无权操作' };

  const { error } = await supabase
    .from('support_sessions')
    .update({ status: 'closed' })
    .eq('id', sessionId);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/admin/support');
  return { ok: true };
}

// ── 8. 获取匿名用户自己的会话 ───────────────────────────────────────────

export async function getMySupportSessions(): Promise<SupportSession[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('support_sessions')
    .select('*')
    .eq('user_id', user?.id ?? '')
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false });

  if (error) return [];
  return data ?? [];
}
