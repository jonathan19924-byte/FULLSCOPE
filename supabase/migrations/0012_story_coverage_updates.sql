-- New coverage that turns out to be a development of an existing story
-- (rather than a new distinct story) is now folded into it instead of
-- generating a duplicate — logged as a third story_updates type alongside
-- reader-trend updates and dedup merges.
alter table public.story_updates drop constraint if exists story_updates_update_type_check;
alter table public.story_updates add constraint story_updates_update_type_check
  check (update_type in ('trend', 'merge', 'coverage'));
