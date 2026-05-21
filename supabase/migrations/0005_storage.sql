-- Storage buckets + RLS for avatars and post images.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- ========== avatars ==========
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars user insert own folder" on storage.objects;
create policy "avatars user insert own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars user update own folder" on storage.objects;
create policy "avatars user update own folder"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars user delete own folder" on storage.objects;
create policy "avatars user delete own folder"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ========== post-images ==========
drop policy if exists "post-images public read" on storage.objects;
create policy "post-images public read"
  on storage.objects for select
  using (bucket_id = 'post-images');

drop policy if exists "post-images authed insert" on storage.objects;
create policy "post-images authed insert"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and auth.role() = 'authenticated'
  );

drop policy if exists "post-images owner delete" on storage.objects;
create policy "post-images owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'post-images'
    and owner = auth.uid()
  );
