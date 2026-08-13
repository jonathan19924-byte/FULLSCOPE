-- Embeddings for similarity-based related-story matching. Replaces the old
-- "10 most-recent live + 5 most-recent archived, same category" candidate
-- window in findRelatedStory() with a real similarity search — that window
-- was blind to continuations of stories older than that, and to any story
-- whose category drifted between the original and the new coverage.
--
-- If this migration fails on `create extension vector`, enable the
-- "vector" extension manually via the Supabase dashboard (Database ->
-- Extensions) — same fallback note as pg_net in 0019.
create extension if not exists vector;

-- voyage-3-lite produces 512-dim embeddings. Nullable: embedding is
-- best-effort at story-generation time (see process-articles.ts) — a failed
-- embed call must never block story creation, matching how every other
-- best-effort enrichment in this pipeline (Wikipedia context, stock photo)
-- degrades on failure rather than erroring out.
alter table public.stories add column if not exists embedding vector(512);

-- ivfflat isn't very meaningful yet at ~60 live stories, but archived
-- stories accumulate indefinitely (never deleted, only enforceStoryCap-ed
-- out of the *live* count) — this is here for when that table has grown,
-- not because it matters today.
create index if not exists stories_embedding_idx
  on public.stories using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Similarity search callable via supabase.rpc(...) — the JS client can't
-- express an `order by embedding <=> $1` directly, so this wraps it.
-- Deliberately no category or live/archived filter: similarity is a better
-- narrowing signal than category ever was (see migration comment above),
-- and letting an old archived story resurface if it's genuinely the closest
-- match is fine — the LLM judgment call downstream (buildRelatedStoryPrompt)
-- still decides whether it's *actually* a continuation, this only decides
-- what gets shown to it as a candidate.
create or replace function match_stories(query_embedding vector(512), match_count int)
returns table (
  id uuid,
  slug text,
  title text,
  summary text,
  archived_at timestamptz,
  timeline jsonb,
  sources jsonb,
  published_at timestamptz
)
language sql stable
as $$
  select id, slug, title, summary, archived_at, timeline, sources, published_at
  from public.stories
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
