import "server-only";
import type { CommunityPost } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";
import { getProfilesByUserIds } from "@/lib/profile/profile-repository";
import { t } from "@/lib/i18n";

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data }, { data: contributions }, { data: likes }] = await Promise.all([
    supabase
      .from("community_posts")
      .select("*")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false }),
    supabase.from("post_contributions").select("post_ids, theme"),
    supabase.from("community_post_likes").select("post_id, user_id"),
  ]);

  // Real per-author identity (added alongside the follow feature) — before
  // this, every post displayed the same hardcoded "Guest reader" string
  // regardless of who actually posted it.
  const profilesByUserId = await getProfilesByUserIds((data ?? []).map((row) => row.user_id));

  // A post's id can appear in at most one contribution in practice (it's
  // credited and excluded from future trend checks once it's used), so a
  // flat post-id -> theme map is enough — no need to track multiples.
  const themeByPostId = new Map<string, string>();
  for (const c of contributions ?? []) {
    for (const postId of c.post_ids ?? []) {
      themeByPostId.set(postId, c.theme);
    }
  }

  const likeCountByPostId = new Map<string, number>();
  const likedByMePostIds = new Set<string>();
  for (const like of likes ?? []) {
    likeCountByPostId.set(like.post_id, (likeCountByPostId.get(like.post_id) ?? 0) + 1);
    if (user && like.user_id === user.id) likedByMePostIds.add(like.post_id);
  }

  return (data ?? []).map((row) => {
    const profile = profilesByUserId.get(row.user_id);
    return {
      id: row.id,
      userId: row.user_id,
      displayName: profile?.displayName || profile?.username || t.profile.guestReader,
      username: profile?.username ?? undefined,
      content: row.content,
      createdAt: row.created_at,
      relatedStorySlug: row.related_story_slug ?? undefined,
      relatedStoryTitle: row.related_story_title ?? undefined,
      relatedStoryCategory: (row.related_story_category ?? undefined) as CommunityPost["relatedStoryCategory"],
      contributionTheme: themeByPostId.get(row.id),
      likeCount: likeCountByPostId.get(row.id) ?? 0,
      likedByMe: user ? likedByMePostIds.has(row.id) : undefined,
      mediaUrl: row.media_status === "approved" ? (row.media_url ?? undefined) : undefined,
    };
  });
}
