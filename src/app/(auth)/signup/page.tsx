'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { signUpAndConfirm } from '@/actions/auth';
import { signUpSchema, type SignUpInput } from '@/lib/validators/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function SignupPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  });

  async function onSubmit(values: SignUpInput) {
    // 服务端创建用户（自动确认邮箱）
    const result = await signUpAndConfirm(values.email, values.password);
    if (!result.ok) {
      toast.error('注册失败', { description: result.error });
      return;
    }

    // 注册成功后立即登录
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (signInError) {
      toast.error('注册成功，但自动登录失败', { description: '请前往登录页手动登录' });
      router.push('/login');
      return;
    }

    toast.success('注册成功，欢迎加入临介社区！');
    router.refresh();
    router.push('/feed');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>注册</CardTitle>
        <CardDescription>创建一个账号加入临介社区</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="至少 6 位"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? '注册中…' : '注册'}
          </Button>
          <p className="text-sm text-muted-foreground">
            已有账号？{' '}
            <Link href="/login" className="text-primary hover:underline">
              前往登录
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
