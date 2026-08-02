-- Expands the story category taxonomy from 4 to 9 (2026-08-02) — see
-- CONTENT_PIPELINE.md for the full reasoning: reviewing all 158 real
-- stories showed "Politics" and "World" had become overloaded catch-alls
-- hiding several genuinely distinct, recurring clusters. Existing stories
-- keep whatever category they already have; only new generations use the
-- finer taxonomy. Postgres can't alter a check constraint in place, so
-- this drops and recreates it.
alter table public.stories drop constraint if exists stories_category_check;
alter table public.stories add constraint stories_category_check check (
  category in (
    'Politics',
    'Security & Defense',
    'Law & Courts',
    'Crime & Safety',
    'World',
    'Business & Economy',
    'Technology',
    'Science',
    'Society & Religion'
  )
);
