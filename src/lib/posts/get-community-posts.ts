import "server-only";
import { unstable_cache } from "next/cache";
import type { CommunityPost } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { getProfilesByUserIds } from "@/lib/profile/profile-repository";
import { t } from "@/lib/i18n";

type CommunityPostBase = Omit<CommunityPost, "likedByMe">;

/** Everything about the community feed that's the same for every visitor —
 * post content, author identity, contribution themes, and like counts.
 * Cached for 30s via a cookie-free client (shorter than the story cache,
 * since this is more social/live content). Deliberately excludes
 * `likedByMe`, which is specific to whoever's asking and must never be
 * cached across users. */
const getCommunityPostsBase = unstable_cache(
  async (): Promise<CommunityPostBase[]> => {
    const supabase = createPublicClient();

    const [{ data }, { data: contributions }, { data: likePostIds }, { data: commentPostIds }] =
      await Promise.all([
        supabase
          .from("community_posts")
          .select("*")
          .eq("is_hidden", false)
          .order("created_at", { ascending: false }),
        supabase.from("post_contributions").select("post_ids, theme"),
        // Only post_id — the per-post count is all the shared/cacheable view
        // needs; who liked what is looked up separately, per-request, below.
        supabase.from("community_post_likes").select("post_id"),
        // Same reasoning as likes — just the count for the feed badge. The
        // actual comment content is fetched on demand per-post instead.
        supabase.from("community_post_comments").select("post_id").eq("is_hidden", false),
      ]);

    // Real per-author identity (added alongside the follow feature) — before
    // this, every post displayed the same hardcoded "Guest reader" string
    // regardless of who actually posted it.
    const profilesByUserId = await getProfilesByUserIds(
      (data ?? []).map((row) => row.user_id),
      supabase,
    );

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
    for (const like of likePostIds ?? []) {
      likeCountByPostId.set(like.post_id, (likeCountByPostId.get(like.post_id) ?? 0) + 1);
    }

    const commentCountByPostId = new Map<string, number>();
    for (const comment of commentPostIds ?? []) {
      commentCountByPostId.set(comment.post_id, (commentCountByPostId.get(comment.post_id) ?? 0) + 1);
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
        mediaUrl: row.media_status === "approved" ? (row.media_url ?? undefined) : undefined,
        commentCount: commentCountByPostId.get(row.id) ?? 0,
      };
    });
  },
  ["community-posts-base"],
  { revalidate: 30 },
);

export async function getCommunityPosts(): Promise<CommunityPost[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const base = await getCommunityPostsBase();
  if (!user) return base.map((post) => ({ ...post, likedByMe: undefined }));

  const { data: myLikes } = await supabase
    .from("community_post_likes")
    .select("post_id")
    .eq("user_id", user.id);
  const likedPostIds = new Set((myLikes ?? []).map((like) => like.post_id));

  return base.map((post) => ({ ...post, likedByMe: likedPostIds.has(post.id) }));
}
