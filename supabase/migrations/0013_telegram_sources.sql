-- Adds Telegram channels as a second raw content source alongside RSS feeds
-- (see CONTENT_PIPELINE.md). source_type lets the backend tell which
-- ingestion path a row came from without changing how it's processed
-- downstream — clustering/generation treat both identically.
alter table public.raw_articles add column if not exists source_type text not null default 'rss'
  check (source_type in ('rss', 'telegram'));

-- Telegram channels don't have a settled lean bucket yet (deliberately
-- deferred — see Decision Log: assigning left/right/centre requires reading
-- enough real content from each channel first, not guessing from a handful
-- of sample posts). 'unclassified' is a temporary placeholder distinct from
-- 'centre' so these rows are never silently mislabeled as neutral.
alter table public.raw_articles drop constraint if exists raw_articles_source_lean_check;
alter table public.raw_articles add constraint raw_articles_source_lean_check check (
  source_lean in ('centre', 'left', 'right', 'international', 'technology', 'science', 'middle_east', 'unclassified')
);
