-- Saving a community post for later — separate from the existing bookmarks
-- table (which is keyed by story_slug and, confusingly, already relabeled
-- "Like" in the story UI) and separate from community_post_likes (a public
-- like count, not a private saved list). Private per-user, so unlike
-- community_post_likes this is NOT publicly readable.

create table if not exists public.post_bookmarks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists post_bookmarks_user_id_idx on public.post_bookmarks (user_id);

alter table public.post_bookmarks enable row level security;

create policy "users can view their own post bookmarks"
  on public.post_bookmarks for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can bookmark posts as themselves"
  on public.post_bookmarks for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can remove their own post bookmark"
  on public.post_bookmarks for delete
  to authenticated
  using (auth.uid() = user_id);
