"use server";

import { revalidatePath } from "next/cache";
import type { Category, PostComment } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPostPhotoClean } from "./media-moderation";
import { getPostComments } from "./get-post-comments";
import { getProfilesByUserIds } from "@/lib/profile/profile-repository";
import { createNotification } from "@/lib/notifications/create-notification";
import { t } from "@/lib/i18n";

export async function createCommunityPostAction(input: {
  content: string;
  relatedStorySlug?: string;
  relatedStoryTitle?: string;
  relatedStoryCategory?: Category;
  mediaUrl?: string;
  perspective?: "A" | "B";
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
      perspective: input.perspective ?? null,
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

    const { data: post } = await supabase
      .from("community_posts")
      .select("user_id")
      .eq("id", postId)
      .maybeSingle();
    if (post) {
      await createNotification(supabase, {
        userId: post.user_id,
        type: "post_liked",
        actorUserId: user.id,
        relatedPostId: postId,
      });
    }
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

/** Fetched on demand when a post's dialog opens — see getPostComments for
 * why this isn't bundled into the main feed payload. */
export async function getPostCommentsAction(postId: string): Promise<PostComment[]> {
  return getPostComments(postId);
}

/** Same anti-spam shape as createCommunityPostAction's rate limit — a
 * comment isn't a policy violation the moderation pass would ever catch
 * (it only flags content, not posting volume), so it needs the same guard
 * independently. */
export async function addCommentAction(
  postId: string,
  content: string,
): Promise<{ comment: PostComment } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.common.notSignedInError };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return { error: t.posts.commentContentRequired };
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("community_post_comments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", tenMinutesAgo);

  if (countError) {
    return { error: countError.message };
  }
  if ((count ?? 0) >= 10) {
    return { error: t.posts.commentingTooFast };
  }

  const { data: inserted, error } = await supabase
    .from("community_post_comments")
    .insert({ post_id: postId, user_id: user.id, content: trimmed })
    .select("id, created_at")
    .single();

  if (error) {
    return { error: error.message };
  }

  const profilesByUserId = await getProfilesByUserIds([user.id], supabase);
  const profile = profilesByUserId.get(user.id);

  const { data: parentPost } = await supabase
    .from("community_posts")
    .select("user_id")
    .eq("id", postId)
    .maybeSingle();
  if (parentPost) {
    await createNotification(supabase, {
      userId: parentPost.user_id,
      type: "post_commented",
      actorUserId: user.id,
      relatedPostId: postId,
    });
  }

  revalidatePath("/posts");
  revalidatePath("/story/[slug]", "page");

  return {
    comment: {
      id: inserted.id,
      postId,
      userId: user.id,
      displayName: profile?.displayName || profile?.username || t.profile.guestReader,
      username: profile?.username ?? undefined,
      content: trimmed,
      createdAt: inserted.created_at,
    },
  };
}

/** Deletes the current user's own comment — RLS (`auth.uid() = user_id`)
 * enforces this can never delete anyone else's regardless of what postId is
 * passed. */
export async function deleteCommentAction(
  commentId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.common.notSignedInError };
  }

  const { error } = await supabase
    .from("community_post_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/posts");
  revalidatePath("/story/[slug]", "page");
  return { success: true };
}
