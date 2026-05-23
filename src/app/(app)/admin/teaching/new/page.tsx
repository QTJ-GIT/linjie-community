import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { TeachingUploadForm } from '@/components/teaching/TeachingUploadForm';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: `发布教学内容 · ${SITE.name}`,
};

export default async function AdminNewTeachingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin-login');

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) redirect('/admin-login');

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">发布教学内容</h2>
        <p className="mt-1 text-sm text-muted-foreground">上传视频或编写文章，分享给所有人</p>
      </div>
      <div className="rounded-xl border border-border/60 bg-card p-6">
        <TeachingUploadForm userId={user.id} />
      </div>
    </div>
  );
}
