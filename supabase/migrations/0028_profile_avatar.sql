-- Profile photo upload. Same shape as post-photos (0016): a public storage
-- bucket, a moderation-status column, vision-checked synchronously at
-- upload time in updateProfileAction — same reasoning as community post
-- photos, an unmoderated public-facing image is worse than a brief upload
-- delay. Unlike post photos (one per post, immutable once posted), an
-- avatar is meant to be replaceable in place, so this also grants an
-- update policy on the user's own folder (post-photos never needed one).

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists avatar_status text
  check (avatar_status in ('pending', 'approved', 'rejected'));

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "profile photos are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'profile-photos');

create policy "users can upload their own profile photo"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can replace their own profile photo"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own profile photo"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
