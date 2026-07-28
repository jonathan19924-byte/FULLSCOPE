-- Stories removed from the main feed (cap eviction, dedup merge) are now
-- archived instead of hard-deleted, so they can be shown in a "History" tab
-- and potentially revived later if new coverage adds context to them.
alter table public.stories add column if not exists archived_at timestamptz;
create index if not exists stories_archived_at_idx on public.stories (archived_at);
