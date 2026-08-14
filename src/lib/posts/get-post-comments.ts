import "server-only";
import type { PostComment } from "@/types/domain";
import { createClient } from "@/lib/supabase/server";
import { getProfilesByUserIds } from "@/lib/profile/profile-repository";
import { getBlockedUserIds } from "@/lib/safety/get-blocked";
import { t } from "@/lib/i18n";

/** Comments for a single post, fetched on demand (when its dialog opens)
 * rather than bundled into the main feed payload — most posts' comments
 * are never viewed in a given session. */
export async function getPostComments(postId: string): Promise<PostComment[]> {
  const supabase = await createClient();
  const [{ data }, blockedUserIds] = await Promise.all([
    supabase
      .from("community_post_comments")
      .select("id, post_id, user_id, content, created_at")
      .eq("post_id", postId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true }),
    getBlockedUserIds(),
  ]);

  if (!data || data.length === 0) return [];

  const blockedSet = new Set(blockedUserIds);
  const visible = data.filter((row) => !blockedSet.has(row.user_id));
  if (visible.length === 0) return [];

  const profilesByUserId = await getProfilesByUserIds(visible.map((row) => row.user_id));

  return visible.map((row) => {
    const profile = profilesByUserId.get(row.user_id);
    return {
      id: row.id,
      postId: row.post_id,
      userId: row.user_id,
      displayName: profile?.displayName || profile?.username || t.profile.guestReader,
      username: profile?.username ?? undefined,
      content: row.content,
      createdAt: row.created_at,
    };
  });
}
