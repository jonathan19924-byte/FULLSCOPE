import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Untyped service-role client, matching trend-detection.ts's own local
// helper rather than importing "@/lib/supabase/admin" — that file has a
// "server-only" import which breaks under plain ts-node (this module is
// pulled into scripts/notify-trending.ts, run outside Next's build).
function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — set them in .env.local (see .env.local.example).",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const TRENDING_WINDOW_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_MS = 48 * 60 * 60 * 1000;
const MIN_RECENT_POSTS = 3;

export type TrendingNotifyResult =
  | { sent: false; reason: "no_candidates" | "all_in_cooldown" }
  | { sent: true; slug: string; notifiedCount: number };

/** Falls back through weaker "top story" signals when there's no real
 * community-post activity to rank by — meant for the pre-launch/no-real-users
 * stage, so the feature still fires on something rather than going silent
 * indefinitely. Once there's real post activity again, notifyTrendingStory's
 * post-count ranking above always wins first; this only ever runs when that
 * comes up completely empty. Tier 2 (page views) still reflects genuine,
 * if thin, reader interest; tier 3 (most recent live story) is a last resort
 * that guarantees a pick as long as any live story exists at all. */
async function fallbackTopStorySlug(
  supabase: ReturnType<typeof createClient>,
  windowStart: string,
): Promise<string | null> {
  const { data: recentViews, error: viewsError } = await supabase
    .from("page_views")
    .select("path")
    .like("path", "/story/%")
    .gte("created_at", windowStart);
  if (viewsError) throw new Error(`Error fetching recent page views: ${viewsError.message}`);

  const viewCountBySlug = new Map<string, number>();
  for (const view of recentViews ?? []) {
    const rawSlug = (view.path as string).replace(/^\/story\//, "").split("?")[0];
    if (!rawSlug) continue;
    // Hebrew slugs land in page_views.path percent-encoded (unlike
    // stories.slug, which is stored decoded) — without this, the slug
    // here would never match a real story row below.
    const slug = decodeURIComponent(rawSlug);
    viewCountBySlug.set(slug, (viewCountBySlug.get(slug) ?? 0) + 1);
  }

  const byViews = [...viewCountBySlug.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (byViews) return byViews;

  const { data: mostRecent, error: recentError } = await supabase
    .from("stories")
    .select("slug")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recentError) throw new Error(`Error fetching most recent story: ${recentError.message}`);

  return mostRecent?.slug ?? null;
}

/**
 * Picks the single most-discussed story in the last 24h (same trending
 * signal already shown to users client-side in most-discussed.tsx: recent
 * community-post count) and, if it clears a minimum activity bar and
 * hasn't been picked again too recently, notifies every approved user.
 * Falls back to weaker signals (page views, then just the newest live
 * story) when there's no real post activity at all — see
 * fallbackTopStorySlug. Run 4x daily via scripts/notify-trending.ts —
 * capped at that frequency by the cron schedule itself, not by extra
 * rate-limit state.
 */
export async function notifyTrendingStory(): Promise<TrendingNotifyResult> {
  const supabase = createClient();
  const windowStart = new Date(Date.now() - TRENDING_WINDOW_MS).toISOString();

  const { data: recentPosts, error: postsError } = await supabase
    .from("community_posts")
    .select("related_story_slug")
    .eq("is_hidden", false)
    .not("related_story_slug", "is", null)
    .gte("created_at", windowStart);
  if (postsError) throw new Error(`Error fetching recent posts: ${postsError.message}`);

  const countBySlug = new Map<string, number>();
  for (const post of recentPosts ?? []) {
    const slug = post.related_story_slug as string;
    countBySlug.set(slug, (countBySlug.get(slug) ?? 0) + 1);
  }

  let candidateSlugs = [...countBySlug.entries()]
    .filter(([, count]) => count >= MIN_RECENT_POSTS)
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => slug);

  if (candidateSlugs.length === 0) {
    const fallbackSlug = await fallbackTopStorySlug(supabase, windowStart);
    if (fallbackSlug) candidateSlugs = [fallbackSlug];
  }

  if (candidateSlugs.length === 0) {
    return { sent: false, reason: "no_candidates" };
  }

  const { data: candidateStories, error: storiesError } = await supabase
    .from("stories")
    .select("id, slug, title, engagement_notified_at")
    .in("slug", candidateSlugs);
  if (storiesError) throw new Error(`Error fetching candidate stories: ${storiesError.message}`);

  const storyBySlug = new Map((candidateStories ?? []).map((s) => [s.slug as string, s]));
  const cooldownCutoff = Date.now() - COOLDOWN_MS;

  const winnerSlug = candidateSlugs.find((slug) => {
    const story = storyBySlug.get(slug);
    if (!story) return false; // e.g. an archived/seed slug with no live row
    const notifiedAt = story.engagement_notified_at ? new Date(story.engagement_notified_at).getTime() : 0;
    return notifiedAt < cooldownCutoff;
  });

  if (!winnerSlug) {
    return { sent: false, reason: "all_in_cooldown" };
  }

  const winnerStory = storyBySlug.get(winnerSlug)!;

  const { data: approvedUsers, error: usersError } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("approval_status", "approved");
  if (usersError) throw new Error(`Error fetching approved users: ${usersError.message}`);

  const rows = (approvedUsers ?? []).map((u) => ({
    user_id: u.user_id as string,
    type: "trending_story",
    related_story_slug: winnerSlug,
    related_story_title: winnerStory.title as string,
  }));

  if (rows.length > 0) {
    const { error: notifyError } = await supabase.from("notifications").insert(rows);
    if (notifyError) throw new Error(`Error inserting trending notifications: ${notifyError.message}`);
  }

  const { error: stampError } = await supabase
    .from("stories")
    .update({ engagement_notified_at: new Date().toISOString() })
    .eq("id", winnerStory.id);
  if (stampError) throw new Error(`Error stamping engagement_notified_at: ${stampError.message}`);

  return { sent: true, slug: winnerSlug, notifiedCount: rows.length };
}
