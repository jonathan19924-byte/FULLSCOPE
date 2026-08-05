-- Lightweight visit tracking for the FullScope_Dashboard analytics view.
-- Insert-only from the app: no select policy, so only the dashboard's
-- service-role client (which bypasses RLS entirely) can read this data.

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists page_views_created_at_idx on public.page_views (created_at desc);

alter table public.page_views enable row level security;

create policy "anyone can log a page view"
  on public.page_views for insert
  to anon, authenticated
  with check (true);
