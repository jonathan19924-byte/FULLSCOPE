-- Adds related_story_title to notifications, denormalized at insert time
-- (matching how related_story_title already works on community_posts) —
-- needed so story_updated/trending_story push/in-app messages can name the
-- actual story instead of a generic "a story" phrase. These two types have
-- no related_post_id to join through for a title (unlike post_liked/
-- post_commented, which already get their story title via community_posts),
-- so the title has to live directly on the notification row.
alter table public.notifications add column if not exists related_story_title text;
