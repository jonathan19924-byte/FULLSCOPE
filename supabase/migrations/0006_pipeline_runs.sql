-- Heartbeat log for the daily process-articles pipeline. Written at the end
-- of every run (success or failure) so a separate, independent watchdog
-- cron (/api/cron/check-pipeline-health) can detect a run that never
-- happened at all — e.g. the GitHub Actions schedule silently not firing,
-- which is exactly what happened on 2026-07-27 and went unnoticed until the
-- story count looked stale. Distinct from raw_articles/stories: those only
-- tell you about the pipeline's OUTPUT, not whether it ran today at all
-- (a legitimate "not enough new articles" day produces zero new stories too,
-- which would otherwise look identical to a dropped cron).
create table if not exists public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null default 'process-articles',
  ran_at timestamptz not null default now(),
  status text not null check (status in ('success', 'error')),
  detail text
);

create index if not exists pipeline_runs_job_ran_at_idx on public.pipeline_runs (job, ran_at desc);

alter table public.pipeline_runs enable row level security;
-- No policies: service-role key only, same as raw_articles — this is
-- internal ops data, never read by the app's own clients.
