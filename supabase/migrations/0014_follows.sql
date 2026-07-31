-- Adds real per-user identity (username/bio) and a follow graph, for the
-- "Following" feed feature. Until now, `profiles.display_name` was never
-- set or read by any app code — every post displayed a hardcoded "Guest
-- Reader" string — so a follow feature needs this identity groundwork
-- first, not just the follows table itself.

-- ---------------------------------------------------------------------------
-- profiles: add username + bio, widen read access
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists username text unique;
alter table public.profiles add column if not exists bio text;

-- A follow feature (and showing real names on posts at all) requires
-- reading OTHER users' identity, not just your own — the original
-- self-read-only policy made that impossible. Nothing in `profiles` is
-- actually sensitive (display name, username, bio, and a theme/category
-- preferences blob), so this widens to a public-read policy rather than
-- splitting into a separate public-safe view.
drop policy if exists "users can read their own profile" on public.profiles;
create policy "profiles are publicly readable"
  on public.profiles for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- follows
-- ---------------------------------------------------------------------------
create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index if not exists follows_follower_id_idx on public.follows (follower_id);
create index if not exists follows_followee_id_idx on public.follows (followee_id);

alter table public.follows enable row level security;

-- Publicly readable so follower/following counts and "people you follow"
-- feeds work for anyone viewing a public profile, same reasoning as
-- community_posts' public-select policy.
create policy "follows are publicly readable"
  on public.follows for select
  to anon, authenticated
  using (true);

create policy "users can follow as themselves"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

create policy "users can unfollow as themselves"
  on public.follows for delete
  to authenticated
  using (auth.uid() = follower_id);
