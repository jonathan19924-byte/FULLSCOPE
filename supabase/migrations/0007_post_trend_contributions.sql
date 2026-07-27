-- Lets real reader posts influence a story's content when several distinct
-- users independently make the same point (never from a single opinion —
-- see src/lib/articles/trend-detection.ts), and tracks which posts did so
-- both to avoid re-crediting them and to drive the "Your impact" profile
-- section and an in-feed badge.

alter table public.stories add column if not exists last_trend_check_at timestamptz;

alter table public.community_posts add column if not exists credited_at timestamptz;

create table if not exists public.post_contributions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  story_slug text not null,
  post_ids uuid[] not null,
  theme text not null,
  update_target text not null check (
    update_target in ('perspective_a_claims', 'perspective_b_claims', 'key_differences_cause', 'key_differences_impact')
  ),
  added_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists post_contributions_story_id_idx on public.post_contributions (story_id);

alter table public.post_contributions enable row level security;

create policy "post contributions are publicly readable"
  on public.post_contributions for select
  to anon, authenticated
  using (true);
-- No insert/update/delete policies: only the service-role key (the
-- trend-detection pipeline) writes here.
