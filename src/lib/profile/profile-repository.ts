import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PublicProfile } from "@/types/domain";

/** Approved avatar_url only — a pending/rejected photo (resolved
 * synchronously at upload time, see updateProfileAction) should never be
 * surfaced to any reader-facing query, including the owner's own. */
function approvedAvatarUrl(avatarUrl: string | null, avatarStatus: string | null): string | null {
  return avatarStatus === "approved" ? avatarUrl : null;
}

/** The current signed-in user's own profile row — used by the settings page
 * to prefill the edit form. Returns null if signed out or (shouldn't
 * happen, the signup trigger always creates one) no row exists yet. */
export async function getMyProfile(): Promise<{
  userId: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
  followerCount: number;
  followingCount: number;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data }, { count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, username, display_name, bio, avatar_url, avatar_status, approval_status")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("followee_id", user.id),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id),
  ]);

  if (!data) return null;

  return {
    userId: data.user_id,
    username: data.username,
    displayName: data.display_name,
    bio: data.bio,
    avatarUrl: approvedAvatarUrl(data.avatar_url, data.avatar_status),
    approvalStatus: data.approval_status as "pending" | "approved" | "rejected",
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
  };
}

/** A public profile page's full data — identity plus follower/following
 * counts. Null if no profile has claimed this username. */
export async function getProfileByUsername(username: string): Promise<PublicProfile | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, bio, avatar_url, avatar_status")
    .eq("username", username)
    .maybeSingle();

  if (!profile || !profile.username) return null;

  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("followee_id", profile.user_id),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", profile.user_id),
  ]);

  return {
    userId: profile.user_id,
    username: profile.username,
    displayName: profile.display_name,
    bio: profile.bio,
    avatarUrl: approvedAvatarUrl(profile.avatar_url, profile.avatar_status),
    followerCount: followerCount ?? 0,
    followingCount: followingCount ?? 0,
  };
}

/** Batch identity lookup for joining post authors — one query for however
 * many distinct authors are in a page of posts, rather than one per post.
 * Takes an optional client so callers that need to run inside a cached,
 * cookie-free context (e.g. getCommunityPosts' cached base query) can pass
 * a public client instead of the default cookie-bound one — profile display
 * names/usernames are public data either way. */
export async function getProfilesByUserIds(
  userIds: string[],
  client?: Awaited<ReturnType<typeof createClient>>,
): Promise<Map<string, { username: string | null; displayName: string | null; avatarUrl: string | null }>> {
  const map = new Map<string, { username: string | null; displayName: string | null; avatarUrl: string | null }>();
  if (userIds.length === 0) return map;

  const supabase = client ?? (await createClient());
  const { data } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, avatar_url, avatar_status")
    .in("user_id", [...new Set(userIds)]);

  for (const row of data ?? []) {
    map.set(row.user_id, {
      username: row.username,
      displayName: row.display_name,
      avatarUrl: approvedAvatarUrl(row.avatar_url, row.avatar_status),
    });
  }
  return map;
}

/** Identities of everyone who follows `userId` — the same shape as
 * `getAllPublicProfiles`, minus the username filter, since a follower who
 * hasn't claimed a username yet should still show up in the list (just
 * without a link to their profile). */
export async function getFollowers(
  userId: string,
): Promise<{ userId: string; username: string | null; displayName: string | null; avatarUrl: string | null }[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("follows").select("follower_id").eq("followee_id", userId);
  const followerIds = (rows ?? []).map((r) => r.follower_id);
  const profiles = await getProfilesByUserIds(followerIds, supabase);

  return followerIds.map((id) => ({
    userId: id,
    username: profiles.get(id)?.username ?? null,
    displayName: profiles.get(id)?.displayName ?? null,
    avatarUrl: profiles.get(id)?.avatarUrl ?? null,
  }));
}

/** Identities of everyone `userId` follows — see getFollowers. */
export async function getFollowingList(
  userId: string,
): Promise<{ userId: string; username: string | null; displayName: string | null; avatarUrl: string | null }[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("follows").select("followee_id").eq("follower_id", userId);
  const followeeIds = (rows ?? []).map((r) => r.followee_id);
  const profiles = await getProfilesByUserIds(followeeIds, supabase);

  return followeeIds.map((id) => ({
    userId: id,
    username: profiles.get(id)?.username ?? null,
    displayName: profiles.get(id)?.displayName ?? null,
    avatarUrl: profiles.get(id)?.avatarUrl ?? null,
  }));
}

/** Every profile that's claimed a username — the pool the People search
 * filters client-side, same "fetch it all upfront, filter in the browser"
 * pattern getAllStories() already uses for story search. Accounts that
 * never set a username are excluded — there's nothing to show or link to
 * for them yet. */
export async function getAllPublicProfiles(): Promise<
  { userId: string; username: string; displayName: string | null; avatarUrl: string | null }[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, avatar_url, avatar_status")
    .not("username", "is", null);

  return (data ?? [])
    .filter(
      (row): row is {
        user_id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        avatar_status: string | null;
      } => Boolean(row.username),
    )
    .map((row) => ({
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: approvedAvatarUrl(row.avatar_url, row.avatar_status),
    }));
}
