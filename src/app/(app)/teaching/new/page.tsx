import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function NewTeachingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) redirect('/teaching');

  redirect('/admin/teaching/new');
}
