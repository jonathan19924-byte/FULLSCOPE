import "server-only";
import type { CommunityPost } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";
import { getProfilesByUserIds } from "@/lib/profile/profile-repository";
import { t } from "@/lib/i18n";

/** A single community post, fetched fresh per-request (no cache) for the
 * dedicated post detail page — unlike the feed's getCommunityPosts, this is
 * never listing many rows so the extra per-post round trip is cheap. */
export async function getCommunityPostById(id: string): Promise<CommunityPost | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: row } = await supabase
    .from("community_posts")
    .select("*")
    .eq("id", id)
    .eq("is_hidden", false)
    .maybeSingle();

  if (!row) return null;

  const [{ count: likeCount }, { count: commentCount }, profilesByUserId, { data: contribution }, myLike] =
    await Promise.all([
      supabase.from("community_post_likes").select("*", { count: "exact", head: true }).eq("post_id", id),
      supabase
        .from("community_post_comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", id)
        .eq("is_hidden", false),
      getProfilesByUserIds([row.user_id], supabase),
      supabase.from("post_contributions").select("theme").contains("post_ids", [id]).maybeSingle(),
      user
        ? supabase.from("community_post_likes").select("id").eq("post_id", id).eq("user_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const profile = profilesByUserId.get(row.user_id);

  return {
    id: row.id,
    userId: row.user_id,
    displayName: profile?.displayName || profile?.username || t.profile.guestReader,
    username: profile?.username ?? undefined,
    authorAvatarUrl: profile?.avatarUrl ?? undefined,
    content: row.content,
    createdAt: row.created_at,
    relatedStorySlug: row.related_story_slug ?? undefined,
    relatedStoryTitle: row.related_story_title ?? undefined,
    relatedStoryCategory: (row.related_story_category ?? undefined) as CommunityPost["relatedStoryCategory"],
    contributionTheme: contribution?.theme ?? undefined,
    likeCount: likeCount ?? 0,
    mediaUrl: row.media_status === "approved" ? (row.media_url ?? undefined) : undefined,
    commentCount: commentCount ?? 0,
    likedByMe: user ? Boolean(myLike.data) : undefined,
  };
}
