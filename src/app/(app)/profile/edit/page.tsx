'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { ImagePlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadAvatar } from '@/lib/upload';
import {
  profileUpdateSchema,
  type ProfileUpdateInput,
} from '@/lib/validators/profile';
import { updateProfile } from '@/actions/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [userId, setUserId] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      handle: '',
      display_name: '',
      bio: '',
      avatar_url: '',
    },
  });

  const watchedAvatar = watch('avatar_url') ?? '';

  useEffect(() => {
    setAvatarUrl(typeof watchedAvatar === 'string' ? watchedAvatar : '');
  }, [watchedAvatar]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      if (!cancelled) setUserId(user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('handle, display_name, bio, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profile) {
        reset({
          handle: profile.handle ?? '',
          display_name: profile.display_name ?? '',
          bio: profile.bio ?? '',
          avatar_url: profile.avatar_url ?? '',
        });
        setAvatarUrl(profile.avatar_url ?? '');
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reset, router]);

  function onSubmit(values: ProfileUpdateInput) {
    startTransition(async () => {
      const payload: ProfileUpdateInput = {
        handle: values.handle.trim(),
        display_name: values.display_name.trim(),
        bio: values.bio?.toString().trim() ? values.bio : null,
        avatar_url: values.avatar_url?.toString().trim()
          ? values.avatar_url
          : null,
      };
      const result = await updateProfile(payload);
      if (!result.ok) {
        toast.error('保存失败', { description: result.error });
        return;
      }
      toast.success('资料已更新');
      router.push(`/profile/${result.handle}`);
      router.refresh();
    });
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!userId) {
      toast.error('请先登录');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadAvatar(userId, file);
      setValue('avatar_url', url, { shouldDirty: true, shouldValidate: true });
      setAvatarUrl(url);
      toast.success('头像已上传', { description: '记得点击保存以生效' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '上传失败';
      toast.error('头像上传失败', { description: msg });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>编辑个人资料</CardTitle>
          <CardDescription>更新你的公开个人信息</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">加载中…</p>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    {avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt="头像" />
                    ) : null}
                    <AvatarFallback>头像</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <ImagePlus className="mr-1 h-4 w-4" />
                      {uploading ? '上传中…' : '更换头像'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      支持 PNG / JPEG / WebP / GIF，最大 5 MB
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={onFileChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="handle">用户名</Label>
                  <Input
                    id="handle"
                    placeholder="字母、数字、下划线"
                    {...register('handle')}
                  />
                  {errors.handle && (
                    <p className="text-sm text-destructive">
                      {errors.handle.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name">显示名</Label>
                  <Input id="display_name" {...register('display_name')} />
                  {errors.display_name && (
                    <p className="text-sm text-destructive">
                      {errors.display_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar_url">头像链接</Label>
                  <Input
                    id="avatar_url"
                    placeholder="https://…"
                    {...register('avatar_url')}
                  />
                  {errors.avatar_url && (
                    <p className="text-sm text-destructive">
                      {errors.avatar_url.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">简介</Label>
                  <Textarea
                    id="bio"
                    rows={4}
                    placeholder="一句话介绍一下自己"
                    {...register('bio')}
                  />
                  {errors.bio && (
                    <p className="text-sm text-destructive">
                      {errors.bio.message}
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="ghost" asChild type="button">
              <Link href="/profile">取消</Link>
            </Button>
            <Button type="submit" disabled={loading || isPending}>
              {isPending ? '保存中…' : '保存'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
