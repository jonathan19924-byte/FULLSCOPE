-- Automated content moderation for real reader posts, folded into the
-- existing every-2-hours trend-check pass (see
-- src/lib/articles/moderation.ts) rather than a separate job, since it's
-- the same "periodically look at new posts" cadence.

alter table public.community_posts add column if not exists moderation_checked_at timestamptz;
alter table public.community_posts add column if not exists is_hidden boolean not null default false;
alter table public.community_posts add column if not exists flagged_reason text;

create index if not exists community_posts_moderation_checked_at_idx on public.community_posts (moderation_checked_at);
