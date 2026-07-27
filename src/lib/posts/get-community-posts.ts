import "server-only";
import type { CommunityPost } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  const supabase = await createClient();
  const [{ data }, { data: contributions }] = await Promise.all([
    supabase.from("community_posts").select("*").order("created_at", { ascending: false }),
    supabase.from("post_contributions").select("post_ids, theme"),
  ]);

  // A post's id can appear in at most one contribution in practice (it's
  // credited and excluded from future trend checks once it's used), so a
  // flat post-id -> theme map is enough — no need to track multiples.
  const themeByPostId = new Map<string, string>();
  for (const c of contributions ?? []) {
    for (const postId of c.post_ids ?? []) {
      themeByPostId.set(postId, c.theme);
    }
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    displayName: "Guest Reader",
    content: row.content,
    createdAt: row.created_at,
    relatedStorySlug: row.related_story_slug ?? undefined,
    relatedStoryTitle: row.related_story_title ?? undefined,
    relatedStoryCategory: (row.related_story_category ?? undefined) as CommunityPost["relatedStoryCategory"],
    contributionTheme: themeByPostId.get(row.id),
  }));
}
