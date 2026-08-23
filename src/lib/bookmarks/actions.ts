"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";

export async function toggleBookmarkAction(
  storySlug: string,
): Promise<{ bookmarked: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.common.notSignedInError };
  }

  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("story_slug", storySlug)
    .maybeSingle();

  if (existing) {
    await supabase.from("bookmarks").delete().eq("id", existing.id);
    revalidatePath("/bookmarks");
    revalidatePath("/profile");
    return { bookmarked: false };
  }

  await supabase.from("bookmarks").insert({ user_id: user.id, story_slug: storySlug });
  // Mutually exclusive with disliking — see toggleDislikeAction.
  await supabase.from("story_dislikes").delete().eq("user_id", user.id).eq("story_slug", storySlug);
  revalidatePath("/bookmarks");
  revalidatePath("/profile");
  return { bookmarked: true };
}

export async function togglePostBookmarkAction(
  postId: string,
): Promise<{ bookmarked: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.common.notSignedInError };
  }

  const { data: existing } = await supabase
    .from("post_bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .maybeSingle();

  if (existing) {
    await supabase.from("post_bookmarks").delete().eq("id", existing.id);
    revalidatePath("/bookmarks");
    return { bookmarked: false };
  }

  await supabase.from("post_bookmarks").insert({ user_id: user.id, post_id: postId });
  revalidatePath("/bookmarks");
  return { bookmarked: true };
}
