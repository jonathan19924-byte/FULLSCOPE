-- In-app notifications — no push/email infra exists yet, so this is
-- polled/refetched on load like everything else in this app (bookmarks,
-- follows), not a realtime subscription. Covers four event types: someone
-- likes your post, comments on your post, follows you, or your post gets
-- credited into a story by the existing trend-detection job. Deliberately
-- excludes dislikes (that signal is private by design — notifying the
-- disliked post's author would leak it) and self-actions (liking/
-- commenting on your own post never creates a notification, enforced in
-- the calling actions, not here).

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('post_liked', 'post_commented', 'new_follower', 'post_credited')),
  -- Null for system-generated events (post_credited, written by the
  -- trend-detection cron via the service-role client, which bypasses RLS —
  -- there's no single "actor" for a multi-reader trend).
  actor_user_id uuid references auth.users (id) on delete set null,
  related_post_id uuid references public.community_posts (id) on delete cascade,
  related_story_slug text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "users can read their own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

-- Any signed-in user can create a notification for someone else, but only
-- ever crediting themselves as the actor — they can't impersonate another
-- actor. This lets ordinary interactive actions (like/comment/follow),
-- which run as the acting user via the normal cookie-bound client, insert
-- directly without needing the service-role key.
create policy "users can create notifications as themselves"
  on public.notifications for insert
  to authenticated
  with check (auth.uid() = actor_user_id);

create policy "users can mark their own notifications read"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
