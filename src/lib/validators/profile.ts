import { z } from 'zod';

export const handleSchema = z
  .string()
  .trim()
  .min(3, '用户名至少 3 个字符')
  .max(32, '用户名过长')
  .regex(/^[a-zA-Z0-9_]+$/, '只能使用字母、数字、下划线');

export const profileUpdateSchema = z.object({
  handle: handleSchema,
  display_name: z.string().trim().min(1).max(64),
  bio: z.string().max(500).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const signUpSchema = z.object({
  email: z.string().trim().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少 6 位').max(72),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().trim().email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
});
export type SignInInput = z.infer<typeof signInSchema>;
