-- Which side of a story's two perspectives a real reader post leans toward
-- (classified at post-creation time, see classify-post-perspective.ts). Null
-- means either the post isn't linked to a story, or it genuinely doesn't fit
-- either side (off-topic, or acknowledges both) — never forced into A or B.

alter table public.community_posts add column if not exists perspective text;

alter table public.community_posts
  add constraint community_posts_perspective_check
  check (perspective is null or perspective in ('A', 'B'));
