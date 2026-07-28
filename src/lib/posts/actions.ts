"use server";

import { revalidatePath } from "next/cache";
import type { Category } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";

export async function createCommunityPostAction(input: {
  content: string;
  relatedStorySlug?: string;
  relatedStoryTitle?: string;
  relatedStoryCategory?: Category;
}): Promise<{ success: true } | { error: string }> {
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

  const { error } = await supabase.from("community_posts").insert({
    user_id: user.id,
    content: input.content,
    related_story_slug: input.relatedStorySlug ?? null,
    related_story_title: input.relatedStoryTitle ?? null,
    related_story_category: input.relatedStoryCategory ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/posts");
  revalidatePath("/story/[slug]", "page");
  return { success: true };
}
