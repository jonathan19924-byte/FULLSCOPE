-- Raw RSS ingestion staging table. Fetched by scripts/fetch-rss.ts (manual
-- run) and app/api/cron/fetch-rss (daily Vercel cron). This is a backend-only
-- staging table — locked to the service-role key, no RLS policies granted to
-- anon/authenticated, since readers never query it directly. A future
-- processing step reads unprocessed rows here and turns them into Stories.

create table if not exists public.raw_articles (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_lean text not null check (
    source_lean in ('centre', 'left', 'right', 'international', 'technology', 'science', 'middle_east')
  ),
  title text not null,
  description text,
  url text not null unique,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  processed boolean not null default false,
  category text
);

create index if not exists raw_articles_processed_idx on public.raw_articles (processed);
create index if not exists raw_articles_published_at_idx on public.raw_articles (published_at desc);

alter table public.raw_articles enable row level security;
-- No policies: only the service-role key (which bypasses RLS) can read or
-- write this table. Not exposed to anon/authenticated clients.
