import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getProfilesByUserIds } from "@/lib/profile/profile-repository";

/** The current signed-in user's own list of blocked-user ids — used both to
 * seed the client-side BlocksProvider and to filter blocked authors out of
 * the community feed/comments server-side. Empty (not an error) when
 * signed out. */
export async function getBlockedUserIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase.from("user_blocks").select("blocked_id").eq("blocker_id", user.id);
  return (data ?? []).map((row) => row.blocked_id);
}

/** Full profile info for everyone the current user has blocked — powers the
 * Blocked accounts settings screen. Mirrors getFollowers/getFollowing's
 * shape so it can reuse the same list-row UI. */
export async function getBlockedProfiles(): Promise<
  { userId: string; username: string | null; displayName: string | null }[]
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase.from("user_blocks").select("blocked_id").eq("blocker_id", user.id);
  const blockedIds = (data ?? []).map((row) => row.blocked_id);
  const profiles = await getProfilesByUserIds(blockedIds, supabase);

  return blockedIds.map((id) => ({
    userId: id,
    username: profiles.get(id)?.username ?? null,
    displayName: profiles.get(id)?.displayName ?? null,
  }));
}
