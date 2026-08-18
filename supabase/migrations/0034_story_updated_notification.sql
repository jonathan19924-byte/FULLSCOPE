-- New notification type: fires when a story a user liked (bookmarked) gets
-- a trend update applied (trend-detection.ts's applyTrend) — not for merge/
-- coverage updates, which aren't meaningful enough to page someone about.
-- System-generated like post_credited: no single actor, actor_user_id stays null.

alter table public.notifications drop constraint notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('post_liked', 'post_commented', 'new_follower', 'post_credited', 'story_updated'));
