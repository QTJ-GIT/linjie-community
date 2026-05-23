import { z } from 'zod';

export const SECTION_SLUGS = ['general', 'qa', 'stocks'] as const;
export type SectionSlug = (typeof SECTION_SLUGS)[number];

export const SENTIMENTS = ['bull', 'bear', 'neutral', 'question', 'rant'] as const;
export type Sentiment = (typeof SENTIMENTS)[number];

export const postCreateSchema = z.object({
  title: z.string().trim().min(3, '标题至少 3 个字符').max(200, '标题过长'),
  body_json: z.record(z.any()),
  body_text: z.string().min(1, '正文不能为空'),
  section_slug: z.string().min(1, '请选择分区'),
  type: z.enum(['post', 'question']).default('post'),
  sentiment: z.enum(SENTIMENTS).optional().nullable(),
});

export type PostCreateInput = z.infer<typeof postCreateSchema>;

export const postUpdateSchema = postCreateSchema.partial().extend({
  id: z.string().uuid(),
});
export type PostUpdateInput = z.infer<typeof postUpdateSchema>;
