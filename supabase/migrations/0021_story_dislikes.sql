-- Private per-user "dislike" signal on stories — a stored preference signal
-- only, not a public feature (no count shown, no list view), mirroring the
-- current shape of `bookmarks` (story_slug text, not a story_id FK, since
-- seed stories aren't real DB rows — see 0002_community_and_bookmarks.sql).
-- Mutually exclusive with bookmarks (now presented in the UI as "Like"):
-- toggleDislikeAction/toggleBookmarkAction each clear the other table's
-- matching row, so a story can never be both liked and disliked at once.

create table if not exists public.story_dislikes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  story_slug text not null,
  created_at timestamptz not null default now(),
  unique (user_id, story_slug)
);

create index if not exists story_dislikes_user_id_idx on public.story_dislikes (user_id);

alter table public.story_dislikes enable row level security;

create policy "users can read their own dislikes"
  on public.story_dislikes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can create their own dislikes"
  on public.story_dislikes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can delete their own dislikes"
  on public.story_dislikes for delete
  to authenticated
  using (auth.uid() = user_id);
