-- Real notification preferences, replacing the fake Settings toggles
-- (previously a static "coming soon" UI with no backing state). Three
-- independent switches: a master push kill-switch, plus two categories
-- matching the two rows already shown to users — "event updates" (system-
-- generated: story credited/updated/trending) and "post interactions"
-- (someone liked/commented/followed). All default true so existing users'
-- behavior doesn't change until they actually touch a toggle. In-app
-- notification rows are always created regardless of these — only the
-- push send (send-push/route.ts) respects them.
alter table public.profiles
  add column if not exists push_enabled boolean not null default true,
  add column if not exists event_updates_enabled boolean not null default true,
  add column if not exists post_interactions_enabled boolean not null default true;

-- New notification type: an automatic "trending story" broadcast, picked
-- daily by a script (src/lib/articles/trending-notifications.ts) rather
-- than by a human editor. System-generated like post_credited/
-- story_updated: no single actor, actor_user_id stays null.
alter table public.notifications drop constraint notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('post_liked', 'post_commented', 'new_follower', 'post_credited', 'story_updated', 'trending_story'));

-- Tracks the last time a story was used for the trending broadcast, so the
-- same story doesn't get re-picked on the very next run just for staying
-- popular — see the cooldown check in trending-notifications.ts.
alter table public.stories add column if not exists engagement_notified_at timestamptz;
