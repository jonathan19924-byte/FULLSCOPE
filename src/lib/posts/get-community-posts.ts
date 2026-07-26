import "server-only";
import type { CommunityPost } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("community_posts")
    .select("*")
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    displayName: "Guest Reader",
    content: row.content,
    createdAt: row.created_at,
    relatedStorySlug: row.related_story_slug ?? undefined,
    relatedStoryTitle: row.related_story_title ?? undefined,
    relatedStoryCategory: (row.related_story_category ?? undefined) as CommunityPost["relatedStoryCategory"],
  }));
}
