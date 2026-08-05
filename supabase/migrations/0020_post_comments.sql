-- Real comments on community posts. Same junction-table relationship as
-- community_post_likes, but stores content text since a comment isn't a
-- toggle, and carries the same moderation columns as community_posts
-- (scanned by the same every-2-hours check-trends cron/GitHub Action).

create table if not exists public.community_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  moderation_checked_at timestamptz,
  is_hidden boolean not null default false,
  flagged_reason text,
  created_at timestamptz not null default now()
);

create index if not exists community_post_comments_post_id_idx on public.community_post_comments (post_id);
create index if not exists community_post_comments_created_at_idx on public.community_post_comments (created_at);

alter table public.community_post_comments enable row level security;

create policy "community post comments are publicly readable"
  on public.community_post_comments for select
  to anon, authenticated
  using (true);

create policy "users can comment as themselves"
  on public.community_post_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can delete their own comment"
  on public.community_post_comments for delete
  to authenticated
  using (auth.uid() = user_id);
