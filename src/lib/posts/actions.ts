"use server";

import { revalidatePath } from "next/cache";
import type { Category } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";

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
    return { error: "Not signed in" };
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
