-- Photo for each generated story, sourced from Pexels (free stock photos,
-- keyword-matched to the story at generation time — see
-- src/lib/articles/pexels.ts). Nullable: seed stories and any story where
-- the Pexels lookup came up empty just fall back to the existing
-- category icon/gradient placeholder in the UI.
alter table public.stories add column if not exists image_url text;
