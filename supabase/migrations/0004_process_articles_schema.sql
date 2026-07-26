-- Schema support for the article-processing pipeline (scripts/process-articles.ts).

-- raw_articles: topic clustering + perspective lean, populated by the
-- processing script (perspective_lean is copied from source_lean when an
-- article's cluster is finalized in Phase D).
alter table public.raw_articles add column if not exists topic_cluster text;
alter table public.raw_articles add column if not exists perspective_lean text;

create index if not exists raw_articles_topic_cluster_idx on public.raw_articles (topic_cluster);

-- stories: generated_at is required to find "the oldest generated story" when
-- enforcing the 30-story cap, and to timestamp when a story was produced by
-- the pipeline (distinct from published_at, which reflects the news event).
alter table public.stories add column if not exists generated_at timestamptz;

create index if not exists stories_generated_at_idx on public.stories (generated_at);
