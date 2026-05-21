import { z } from 'zod';

export const commentCreateSchema = z.object({
  post_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  body_json: z.record(z.any()),
  body_text: z.string().trim().min(1, '内容不能为空').max(4000, '内容过长'),
});
export type CommentCreateInput = z.infer<typeof commentCreateSchema>;
