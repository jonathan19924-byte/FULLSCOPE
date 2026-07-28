-- Real, persisted likes on community posts (the "Like" button was previously
-- pure client-side UI state, never saved) — the basis for ranking posts by
-- quality instead of strictly chronological order. Scoped to community_posts
-- only, not the seeded/generated posts table, since the actual goal is
-- surfacing the best real reader contributions as they start to outnumber
-- the seeded ones.

create table if not exists public.community_post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists community_post_likes_post_id_idx on public.community_post_likes (post_id);

alter table public.community_post_likes enable row level security;

create policy "community post likes are publicly readable"
  on public.community_post_likes for select
  to anon, authenticated
  using (true);

create policy "users can like posts as themselves"
  on public.community_post_likes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can remove their own like"
  on public.community_post_likes for delete
  to authenticated
  using (auth.uid() = user_id);
