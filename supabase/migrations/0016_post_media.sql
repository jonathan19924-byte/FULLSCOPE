-- Adds photo support to community posts: a storage bucket for the uploaded
-- files, plus columns tracking moderation status. Photos are gated behind
-- moderation (a Claude vision check run synchronously in the same server
-- action that creates the post — see createCommunityPostAction) before
-- they're shown to anyone else, since a bad image sitting in the public feed
-- until the next moderation cron pass is worse than a brief upload delay.

alter table public.community_posts add column if not exists media_url text;
alter table public.community_posts add column if not exists media_status text
  check (media_status in ('pending', 'approved', 'rejected'));

insert into storage.buckets (id, name, public)
values ('post-photos', 'post-photos', true)
on conflict (id) do nothing;

-- Anyone can view files in the bucket (posts are public), but a user may
-- only upload into their own folder (post-photos/{user_id}/...), and only
-- delete files they uploaded. There's no update policy — a post's photo is
-- immutable once uploaded; changing it means removing and re-adding.
create policy "post photos are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'post-photos');

create policy "users can upload post photos to their own folder"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own post photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-photos' and (storage.foldername(name))[1] = auth.uid()::text);
