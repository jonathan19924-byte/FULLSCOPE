-- User-facing content reporting and account blocking. Required for App
-- Store review of apps with user-generated content (Guideline 1.2): readers
-- need a way to flag objectionable posts/comments/users, and to block a
-- specific abusive user so their content stops appearing. Reports aren't
-- surfaced anywhere in-app (no admin UI exists yet) — same "founder checks
-- the table directly" pattern as post_moderation's flagged_reason column.

-- ---------------------------------------------------------------------------
-- content_reports
-- ---------------------------------------------------------------------------
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment', 'user')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate', 'misinformation', 'other')),
  details text,
  created_at timestamptz not null default now()
);

create index if not exists content_reports_target_idx on public.content_reports (target_type, target_id);

alter table public.content_reports enable row level security;

create policy "users can create reports as themselves"
  on public.content_reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- Deliberately no select policy for regular users — reports are reviewed
-- via the Supabase dashboard (service-role key), not an in-app screen.

-- ---------------------------------------------------------------------------
-- user_blocks
-- ---------------------------------------------------------------------------
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists user_blocks_blocker_id_idx on public.user_blocks (blocker_id);
create index if not exists user_blocks_blocked_id_idx on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

-- Unlike follows, who's-blocked-whom is private — only the blocker can read
-- their own block list (used to filter their feed and to render the
-- Blocked accounts settings screen).
create policy "users can read their own blocks"
  on public.user_blocks for select
  to authenticated
  using (auth.uid() = blocker_id);

create policy "users can block as themselves"
  on public.user_blocks for insert
  to authenticated
  with check (auth.uid() = blocker_id);

create policy "users can unblock as themselves"
  on public.user_blocks for delete
  to authenticated
  using (auth.uid() = blocker_id);
