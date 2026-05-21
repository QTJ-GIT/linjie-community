'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const reportSchema = z.object({
  target_type: z.enum(['post', 'comment', 'chat_message', 'user']),
  target_id: z.string().uuid({ message: '无效目标 ID' }),
  reason: z
    .string()
    .trim()
    .min(1, '请填写举报理由')
    .max(500, '举报理由最多 500 字'),
});

export type ReportInput = z.infer<typeof reportSchema>;

export async function reportContent(input: ReportInput): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? '输入无效' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { target_type, target_id, reason } = parsed.data;

  // Disallow reporting yourself
  if (target_type === 'user' && target_id === user.id) {
    return { ok: false, error: '无法举报自己' };
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type,
    target_id,
    reason,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
