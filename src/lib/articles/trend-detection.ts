import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { callClaude, parseClaudeJson } from "./claude";
import { logStoryUpdate } from "./story-updates";
import { createNotification } from "../notifications/create-notification";

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

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") return JSON.stringify(err);
  return String(err);
}

/** A trend needs at least this many DISTINCT users making a similar point —
 * never a single opinion, per the actual product requirement. Re-checked
 * server-side against Claude's answer, not just asked for in the prompt. */
const MIN_DISTINCT_USERS = 2;

type UpdateTarget = "perspective_a_claims" | "perspective_b_claims" | "key_differences_cause" | "key_differences_impact";

interface UncreditedPost {
  id: string;
  related_story_slug: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface StoryRow {
  id: string;
  slug: string;
  key_differences_cause: string;
  key_differences_impact: string;
  perspective_a: { name: string; summary: string; claims: string[] };
  perspective_b: { name: string; summary: string; claims: string[] };
  last_trend_check_at: string | null;
}

interface TrendResult {
  trend_found: boolean;
  theme: string;
  contributing_post_ids: string[];
  update_target: UpdateTarget;
  added_text: string;
}

function buildTrendPrompt(story: StoryRow, posts: UncreditedPost[]): string {
  const postsList = posts.map((p) => `[${p.id}] (reader ${p.user_id}): ${p.content}`).join("\n");

  return `You are reviewing reader reactions to a news story to check for a genuine emerging trend — several DIFFERENT readers independently making the same point that isn't already reflected in the story below. This must never trigger for a single reader's opinion, only a real pattern across distinct people.

Perspective A "${story.perspective_a.name}" claims: ${story.perspective_a.claims.join(" | ")}
Perspective B "${story.perspective_b.name}" claims: ${story.perspective_b.claims.join(" | ")}
Key difference (cause): ${story.key_differences_cause}
Key difference (impact): ${story.key_differences_impact}

Reader posts:
${postsList}

Only report a trend if at least ${MIN_DISTINCT_USERS} posts from DIFFERENT readers make a similar point that adds genuinely new information not already covered above. Do not force it — if there's no real trend, say so honestly.

Return ONLY valid JSON in this exact structure:
{
  "trend_found": boolean,
  "theme": "short description of the trend, or empty string if none",
  "contributing_post_ids": ["id1", "id2", ...] (only if trend_found — must be the bracketed ids above, from at least ${MIN_DISTINCT_USERS} distinct readers),
  "update_target": "perspective_a_claims" | "perspective_b_claims" | "key_differences_cause" | "key_differences_impact" (only if trend_found — whichever this trend most belongs to),
  "added_text": "one short sentence reflecting this trend, written in the SAME language as the claims/differences above (only if trend_found)"
}`;
}

export interface TrendCheckResult {
  storiesChecked: number;
  storiesUpdated: number;
  errors: number;
}

/** Scans real reader posts for emerging trends and, when found, folds them
 * into the relevant story — additively (a new claim, or an added sentence
 * on the existing key-differences text), never rewriting what's there.
 * Designed to be cheap to run every couple of hours: skips any story with
 * fewer than MIN_DISTINCT_USERS uncredited posts (can't possibly qualify —
 * no Claude call spent), and skips any story with no NEW uncredited post
 * since its last check (nothing changed, re-asking would just repeat the
 * same answer for the same tokens). */
export async function checkStoryTrends(): Promise<TrendCheckResult> {
  const supabase = createClient();
  let storiesChecked = 0;
  let storiesUpdated = 0;
  let errors = 0;

  const { data: posts, error: postsError } = await supabase
    .from("community_posts")
    .select("id, related_story_slug, user_id, content, created_at")
    .is("credited_at", null)
    .eq("is_hidden", false)
    .not("related_story_slug", "is", null);

  if (postsError) {
    console.error("Error fetching uncredited community posts:", postsError.message);
    return { storiesChecked, storiesUpdated, errors: 1 };
  }

  const bySlug = new Map<string, UncreditedPost[]>();
  for (const p of (posts ?? []) as UncreditedPost[]) {
    const list = bySlug.get(p.related_story_slug) ?? [];
    list.push(p);
    bySlug.set(p.related_story_slug, list);
  }

  const candidateSlugs = [...bySlug.entries()].filter(
    ([, list]) => new Set(list.map((p) => p.user_id)).size >= MIN_DISTINCT_USERS,
  );

  for (const [slug, candidatePosts] of candidateSlugs) {
    const { data: story, error: storyError } = await supabase
      .from("stories")
      .select("id, slug, key_differences_cause, key_differences_impact, perspective_a, perspective_b, last_trend_check_at")
      .eq("slug", slug)
      .is("archived_at", null)
      .maybeSingle();

    if (storyError) {
      console.error(`Error fetching story "${slug}":`, storyError.message);
      errors++;
      continue;
    }
    if (!story) continue; // e.g. a seed-story slug from before the Hebrew pivot, or since archived — not a live generated story

    const lastCheck = story.last_trend_check_at ? new Date(story.last_trend_check_at).getTime() : 0;
    const hasNewSinceLastCheck = candidatePosts.some((p) => new Date(p.created_at).getTime() > lastCheck);
    if (!hasNewSinceLastCheck) continue; // nothing changed since we last asked — save the tokens

    storiesChecked++;

    try {
      const raw = await callClaude(buildTrendPrompt(story as StoryRow, candidatePosts), 400);
      const result = parseClaudeJson<TrendResult>(raw);

      if (result.trend_found) {
        const validIds = result.contributing_post_ids.filter((id) => candidatePosts.some((p) => p.id === id));
        const distinctUsers = new Set(
          validIds.map((id) => candidatePosts.find((p) => p.id === id)!.user_id),
        );

        if (validIds.length < MIN_DISTINCT_USERS || distinctUsers.size < MIN_DISTINCT_USERS) {
          console.log(`Trend claimed for "${slug}" but failed the distinct-user check — skipping`);
        } else {
          await applyTrend(supabase, story as StoryRow, result, validIds);
          storiesUpdated++;
          console.log(`Applied trend to "${slug}": ${result.theme}`);
        }
      }
    } catch (err) {
      console.error(`Error checking trend for "${slug}":`, describeError(err));
      errors++;
    }

    await supabase.from("stories").update({ last_trend_check_at: new Date().toISOString() }).eq("id", story.id);
  }

  return { storiesChecked, storiesUpdated, errors };
}

async function applyTrend(
  supabase: ReturnType<typeof createClient>,
  story: StoryRow,
  result: TrendResult,
  postIds: string[],
): Promise<void> {
  const update: Record<string, unknown> = {};

  if (result.update_target === "perspective_a_claims") {
    update.perspective_a = { ...story.perspective_a, claims: [...story.perspective_a.claims, result.added_text] };
  } else if (result.update_target === "perspective_b_claims") {
    update.perspective_b = { ...story.perspective_b, claims: [...story.perspective_b.claims, result.added_text] };
  } else if (result.update_target === "key_differences_cause") {
    update.key_differences_cause = `${story.key_differences_cause} ${result.added_text}`;
  } else {
    update.key_differences_impact = `${story.key_differences_impact} ${result.added_text}`;
  }

  const { error: updateError } = await supabase.from("stories").update(update).eq("id", story.id);
  if (updateError) throw new Error(`Error updating story: ${updateError.message}`);

  const { error: contributionError } = await supabase.from("post_contributions").insert({
    story_id: story.id,
    story_slug: story.slug,
    post_ids: postIds,
    theme: result.theme,
    update_target: result.update_target,
    added_text: result.added_text,
  });
  if (contributionError) throw new Error(`Error recording contribution: ${contributionError.message}`);

  const { error: creditError } = await supabase
    .from("community_posts")
    .update({ credited_at: new Date().toISOString() })
    .in("id", postIds);
  if (creditError) throw new Error(`Error crediting posts: ${creditError.message}`);

  const { data: creditedPosts } = await supabase
    .from("community_posts")
    .select("id, user_id")
    .in("id", postIds);
  const firstPostIdByUser = new Map<string, string>();
  for (const p of creditedPosts ?? []) {
    if (!firstPostIdByUser.has(p.user_id)) firstPostIdByUser.set(p.user_id, p.id);
  }
  for (const [userId, postId] of firstPostIdByUser) {
    await createNotification(supabase, {
      userId,
      type: "post_credited",
      relatedPostId: postId,
      relatedStorySlug: story.slug,
    });
  }

  await logStoryUpdate(supabase, {
    storyId: story.id,
    storySlug: story.slug,
    updateType: "trend",
    summary: result.theme,
  });
}
