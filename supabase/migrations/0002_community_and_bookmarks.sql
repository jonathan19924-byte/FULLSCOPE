-- Adds real user-generated content and fixes bookmarks to reference stories
-- by slug (seed story ids are non-UUID strings like "story-1", so they can't
-- be a real foreign key into a uuid-keyed stories table).

-- ---------------------------------------------------------------------------
-- community_posts (user-authored posts, separate from seeded posts)
-- ---------------------------------------------------------------------------
create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  related_story_slug text,
  related_story_title text,
  related_story_category text,
  created_at timestamptz not null default now()
);

create index if not exists community_posts_user_id_idx on public.community_posts (user_id);
create index if not exists community_posts_created_at_idx on public.community_posts (created_at desc);

alter table public.community_posts enable row level security;

create policy "community posts are publicly readable"
  on public.community_posts for select
  to anon, authenticated
  using (true);

create policy "users can create their own community posts"
  on public.community_posts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can delete their own community posts"
  on public.community_posts for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- bookmarks: switch from story_id (uuid FK) to story_slug (text, no FK)
-- ---------------------------------------------------------------------------
alter table public.bookmarks drop constraint if exists bookmarks_story_id_fkey;
alter table public.bookmarks drop constraint if exists bookmarks_user_id_story_id_key;

alter table public.bookmarks add column if not exists story_slug text;
alter table public.bookmarks drop column if exists story_id;
alter table public.bookmarks alter column story_slug set not null;

alter table public.bookmarks add constraint bookmarks_user_id_story_slug_key unique (user_id, story_slug);
