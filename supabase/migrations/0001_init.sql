-- FullScope initial schema
-- Tables: stories, posts (seed content — public, read-only to clients),
--         bookmarks, profiles (per-user data — protected by RLS).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- stories
-- ---------------------------------------------------------------------------
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (category in ('Politics', 'World', 'Technology', 'Science')),
  summary text not null,
  what_happened text not null,
  timeline jsonb not null default '[]', -- Fact[] -> { text, confidence }[]
  perspective_a jsonb not null,          -- Perspective -> { name, summary, claims[] }
  perspective_b jsonb not null,
  key_differences_cause text not null,
  key_differences_impact text not null,
  sources jsonb not null default '[]',   -- Source[] -> { publisher, title?, url?, publishedAt? }
  entities jsonb not null default '{"people":[],"companies":[],"countries":[]}',
  published_at timestamptz not null,
  reading_time_minutes integer not null default 3,
  created_at timestamptz not null default now()
);

create index if not exists stories_category_idx on public.stories (category);
create index if not exists stories_published_at_idx on public.stories (published_at desc);

alter table public.stories enable row level security;

create policy "stories are publicly readable"
  on public.stories for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- posts (public discussion feed seeded alongside each story)
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  display_name text not null,
  perspective text not null check (perspective in ('A', 'B')),
  content text not null,
  is_generated boolean not null default true,
  like_count integer not null default 0,
  reply_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists posts_story_id_idx on public.posts (story_id);

alter table public.posts enable row level security;

create policy "posts are publicly readable"
  on public.posts for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  preferences jsonb not null default '{"theme": "system", "followedCategories": []}',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users can read their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- bookmarks
-- ---------------------------------------------------------------------------
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  story_id uuid not null references public.stories (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, story_id)
);

create index if not exists bookmarks_user_id_idx on public.bookmarks (user_id);

alter table public.bookmarks enable row level security;

create policy "users can read their own bookmarks"
  on public.bookmarks for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can create their own bookmarks"
  on public.bookmarks for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can delete their own bookmarks"
  on public.bookmarks for delete
  to authenticated
  using (auth.uid() = user_id);
