import type { Notification } from "@/types/domain";
import { t } from "@/lib/i18n";

/** Shared with the push-notification webhook (send-push/route.ts) so the
 * push body text always matches what the in-app notification list shows. */
export function messageFor(n: Pick<Notification, "type" | "actorDisplayName" | "actorUsername">): string {
  const name = n.actorDisplayName || n.actorUsername || t.notifications.someone;
  switch (n.type) {
    case "post_liked":
      return t.notifications.postLiked(name);
    case "post_commented":
      return t.notifications.postCommented(name);
    case "new_follower":
      return t.notifications.newFollower(name);
    case "post_credited":
      return t.notifications.postCredited;
    case "story_updated":
      return t.notifications.storyUpdated;
    case "trending_story":
      return t.notifications.trendingStory;
  }
}

export function linkFor(n: Pick<Notification, "type" | "relatedStorySlug" | "actorUsername">): string | undefined {
  switch (n.type) {
    case "post_liked":
    case "post_commented":
      return n.relatedStorySlug ? `/story/${n.relatedStorySlug}` : "/posts";
    case "post_credited":
    case "story_updated":
    case "trending_story":
      return n.relatedStorySlug ? `/story/${n.relatedStorySlug}` : undefined;
    case "new_follower":
      return n.actorUsername ? `/profile/${n.actorUsername}` : undefined;
  }
}
