"use server";

import { revalidatePath } from "next/cache";
import type { Category } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPostPhotoClean } from "./media-moderation";
import { t } from "@/lib/i18n";

export async function createCommunityPostAction(input: {
  content: string;
  relatedStorySlug?: string;
  relatedStoryTitle?: string;
  relatedStoryCategory?: Category;
  mediaUrl?: string;
}): Promise<{ success: true; mediaRejected: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.common.notSignedInError };
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("community_posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", tenMinutesAgo);

  if (countError) {
    return { error: countError.message };
  }
  if ((count ?? 0) >= 10) {
    return { error: t.posts.postingTooFast };
  }

  const { data: inserted, error } = await supabase
    .from("community_posts")
    .insert({
      user_id: user.id,
      content: input.content,
      related_story_slug: input.relatedStorySlug ?? null,
      related_story_title: input.relatedStoryTitle ?? null,
      related_story_category: input.relatedStoryCategory ?? null,
      media_url: input.mediaUrl ?? null,
      media_status: input.mediaUrl ? "pending" : null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  // Checked synchronously (one image, cheap) so a bad photo never has a
  // window where it's live in the public feed before a cron pass catches it
  // — see media-moderation.ts for why this fails closed on error. Written
  // via the admin client, not the user's own RLS-scoped session: deciding
  // moderation outcome is a trusted server decision, not something a user's
  // own row-ownership should grant write access to (there's deliberately no
  // general "update your own post" policy on this table).
  let mediaRejected = false;
  if (input.mediaUrl) {
    const clean = await isPostPhotoClean(input.mediaUrl);
    mediaRejected = !clean;
    await createAdminClient()
      .from("community_posts")
      .update({ media_status: clean ? "approved" : "rejected" })
      .eq("id", inserted.id);
  }

  revalidatePath("/posts");
  revalidatePath("/story/[slug]", "page");
  return { success: true, mediaRejected };
}

/** Toggles the current user's like on a community post — real, persisted
 * likes (community_post_likes), unlike the old client-only "Like" button
 * state. Returns the post's new total like count so the client doesn't need
 * a full refetch to stay in sync. */
export async function toggleCommunityPostLikeAction(
  postId: string,
): Promise<{ liked: boolean; likeCount: number } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.common.notSignedInError };
  }

  const { data: existing, error: existingError } = await supabase
    .from("community_post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message };
  }

  let liked: boolean;

  if (existing) {
    const { error } = await supabase.from("community_post_likes").delete().eq("id", existing.id);
    if (error) return { error: error.message };
    liked = false;
  } else {
    const { error } = await supabase
      .from("community_post_likes")
      .insert({ post_id: postId, user_id: user.id });
    if (error) return { error: error.message };
    liked = true;
  }

  const { count, error: countError } = await supabase
    .from("community_post_likes")
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);

  if (countError) {
    return { error: countError.message };
  }

  revalidatePath("/posts");
  revalidatePath("/story/[slug]", "page");
  return { liked, likeCount: count ?? 0 };
}
