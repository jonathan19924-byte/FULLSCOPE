"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";

/** Mutually exclusive with liking (bookmarks) — turning a dislike on removes
 * any existing like for the same story, mirrored by toggleBookmarkAction
 * clearing dislikes in the other direction. Private signal only: no public
 * count, no list view, see 0021_story_dislikes.sql. */
export async function toggleDislikeAction(
  storySlug: string,
): Promise<{ disliked: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.common.notSignedInError };
  }

  const { data: existing } = await supabase
    .from("story_dislikes")
    .select("id")
    .eq("user_id", user.id)
    .eq("story_slug", storySlug)
    .maybeSingle();

  if (existing) {
    await supabase.from("story_dislikes").delete().eq("id", existing.id);
    return { disliked: false };
  }

  await supabase.from("story_dislikes").insert({ user_id: user.id, story_slug: storySlug });
  await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("story_slug", storySlug);
  revalidatePath("/bookmarks");
  revalidatePath("/profile");
  return { disliked: true };
}
