import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Most recent time the current signed-in user viewed this story, from
 * page_views — used to highlight which story_updates entries are new since
 * their last visit. PageViewTracker (page-view-tracker.tsx) logs the
 * current visit client-side, AFTER this server component has already
 * rendered — so this naturally reflects state as of before the current
 * visit, no race condition to guard against explicitly.
 *
 * Returns null for a first-time visitor or a signed-out reader (page_views
 * only has a real user_id when signed in) — callers should treat null as
 * "nothing to compare against," not "everything is old."
 */
export async function getLastViewedAt(storySlug: string): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("page_views")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("path", `/story/${storySlug}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.created_at ?? null;
}
