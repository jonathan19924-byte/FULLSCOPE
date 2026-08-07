import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getProfilesByUserIds } from "@/lib/profile/profile-repository";
import type { Notification } from "@/types/domain";

const NOTIFICATION_LIMIT = 30;

/** The signed-in reader's most recent notifications, newest first. Hydrates
 * actor identity and the related post's content/story title in two batch
 * queries rather than per-row joins — same "fetch the rows, then batch
 * resolve" pattern as getCommunityPosts. Empty array when signed out. */
export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: rows } = await supabase
    .from("notifications")
    .select("id, type, actor_user_id, related_post_id, related_story_slug, created_at, read_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATION_LIMIT);

  if (!rows || rows.length === 0) return [];

  const actorIds = [...new Set(rows.map((r) => r.actor_user_id).filter((id): id is string => Boolean(id)))];
  const postIds = [...new Set(rows.map((r) => r.related_post_id).filter((id): id is string => Boolean(id)))];

  const [profiles, posts] = await Promise.all([
    getProfilesByUserIds(actorIds, supabase),
    postIds.length > 0
      ? supabase.from("community_posts").select("id, related_story_slug, related_story_title").in("id", postIds)
      : Promise.resolve({ data: [] }),
  ]);

  const postById = new Map((posts.data ?? []).map((p) => [p.id, p]));

  return rows.map((row) => {
    const actor = row.actor_user_id ? profiles.get(row.actor_user_id) : undefined;
    const post = row.related_post_id ? postById.get(row.related_post_id) : undefined;

    return {
      id: row.id,
      type: row.type,
      actorUserId: row.actor_user_id ?? undefined,
      actorDisplayName: actor?.displayName ?? undefined,
      actorUsername: actor?.username ?? undefined,
      relatedPostId: row.related_post_id ?? undefined,
      relatedStorySlug: row.related_story_slug ?? post?.related_story_slug ?? undefined,
      relatedStoryTitle: post?.related_story_title ?? undefined,
      createdAt: row.created_at,
      readAt: row.read_at ?? undefined,
    };
  });
}

export async function getUnreadNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null);

  return count ?? 0;
}
