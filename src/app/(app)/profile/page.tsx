import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function MyProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('handle')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.handle) {
    redirect('/profile/edit');
  }

  redirect(`/profile/${profile.handle}`);
}
