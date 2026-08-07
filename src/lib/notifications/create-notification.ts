import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Shared insert helper used by both interactive server actions (cookie-
 * bound client, acting as the actor — satisfies the "users can create
 * notifications as themselves" RLS policy) and the trend-detection cron
 * (untyped service-role client, actorUserId omitted since a multi-reader
 * trend has no single actor — bypasses RLS entirely). Untyped `SupabaseClient`
 * on purpose: the cron's own service-role client (trend-detection.ts) isn't
 * typed against Database either, matching that file's existing looseness.
 * Never notifies a user about their own action. */
export async function createNotification(
  supabase: SupabaseClient,
  params: {
    userId: string;
    type: "post_liked" | "post_commented" | "new_follower" | "post_credited";
    actorUserId?: string;
    relatedPostId?: string;
    relatedStorySlug?: string;
  },
): Promise<void> {
  if (params.actorUserId && params.actorUserId === params.userId) return;

  await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    actor_user_id: params.actorUserId ?? null,
    related_post_id: params.relatedPostId ?? null,
    related_story_slug: params.relatedStorySlug ?? null,
  });
}
