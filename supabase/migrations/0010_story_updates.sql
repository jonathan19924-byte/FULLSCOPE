-- Visible "this story has developed" history — stories already get merged
-- (dedupeStories) and content-updated (trend-detection's applyTrend) over
-- time, but neither was ever recorded anywhere readers could see. This is a
-- plain append-only log of both, read-only to clients, written only by the
-- pipeline (service role).

create table if not exists public.story_updates (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  story_slug text not null,
  update_type text not null check (update_type in ('trend', 'merge')),
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists story_updates_story_id_idx on public.story_updates (story_id, created_at desc);

alter table public.story_updates enable row level security;

create policy "story updates are publicly readable"
  on public.story_updates for select
  to anon, authenticated
  using (true);
-- No insert/update/delete policies: only the service-role key (the
-- pipeline) writes here.
