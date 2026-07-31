import "server-only";
import { createClient } from "@/lib/supabase/server";

/** The current signed-in user's own list of followee ids — used both to
 * seed the client-side FollowsProvider and to filter the Following feed
 * toggle. Empty (not an error) when signed out. */
export async function getFollowingIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase.from("follows").select("followee_id").eq("follower_id", user.id);
  return (data ?? []).map((row) => row.followee_id);
}
