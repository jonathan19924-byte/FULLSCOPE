import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { callClaude, parseClaudeJson } from "./claude";
import { findStoryImage } from "./pexels";
import { sendPipelineSummaryEmail } from "../notifications/email";

/**
 * Untyped on purpose, same reasoning as src/lib/rss/fetch-rss.ts: this
 * pipeline's tables (raw_articles) and its extra query shapes on the
 * app-facing tables (stories, posts) don't need to round-trip through
 * src/lib/supabase/database.types.ts, which mirrors the app's own read paths.
 */
function createProcessingClient() {
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

type SupabaseAdmin = ReturnType<typeof createProcessingClient>;

/** Generated stories are capped at this many — the oldest is deleted (along
 * with its posts, via ON DELETE CASCADE) when a new one would exceed it. */
const MAX_STORIES = 60;

interface RawArticleRow {
  id: string;
  source_name: string;
  source_lean: string;
  title: string;
  description: string | null;
  published_at: string | null;
}

interface ClusterResult {
  topic_name: string;
  category: string;
  article_indices: number[];
}

interface ClusteringResponse {
  clusters: ClusterResult[];
}

interface StoryGenerationResponse {
  title: string;
  summary: string;
  category: string;
  perspective_a_name: string;
  perspective_a: string;
  perspective_a_claims: string[];
  perspective_b_name: string;
  perspective_b: string;
  perspective_b_claims: string[];
  what_happened: string;
  what_happened_timeline: string[];
  key_differences_cause: string;
  key_differences_impact: string;
  sources: string;
}

interface PostGenerationResponse {
  posts: { display_name: string; content: string; perspective: "A" | "B" }[];
}

interface DuplicateGroupResult {
  story_indices: number[];
}

interface DedupResponse {
  duplicate_groups: DuplicateGroupResult[];
}

export interface ProcessArticlesResult {
  processedCount: number;
  newStoryCount: number;
  mergedDuplicateCount: number;
  totalStories: number;
}

/** Supabase errors are plain objects with a `.message` (not real Error
 * instances), so `instanceof Error` misses them and they'd otherwise log as
 * the unhelpful "[object Object]". */
function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

function buildClusteringPrompt(articles: RawArticleRow[]): string {
  const list = articles
    .map((a, i) => `${i}. ${a.source_name} (${a.source_lean}): ${a.title} — ${a.description ?? ""}`)
    .join("\n");

  return `You are a news editor. Below are news article headlines and summaries fetched from multiple sources today. Group them into topic clusters — stories that are about the same real-world event or issue.

Rules:
- Only create a cluster if at least 2 articles from DIFFERENT sources cover the same topic
- Ignore articles that don't have at least one other article covering the same topic
- Give each cluster a short descriptive name (e.g. 'Iran War Escalation', 'Spain World Cup Win', 'Tate Brothers Arrest')
- Return ONLY valid JSON, no other text

Return this exact JSON structure:
{
  "clusters": [
    {
      "topic_name": "string",
      "category": "Politics|World|Technology|Science",
      "article_indices": [0, 3, 7]
    }
  ]
}

Articles:
${list}`;
}

function buildStoryPrompt(topicName: string, articles: RawArticleRow[]): string {
  const list = articles
    .map((a) => `${a.source_name} (${a.source_lean}): ${a.title} — ${a.description ?? ""}`)
    .join("\n");

  return `You are a news editor for FullScope, a news platform that shows every story from multiple perspectives. Based on the following articles about ${topicName}, generate a complete story entry.

Articles provided:
${list}

Return ONLY valid JSON with this exact structure:
{
  "title": "Engaging, objective headline under 15 words, no question mark at end",
  "summary": "2 sentence neutral summary of what happened",
  "category": "Politics|World|Technology|Science",
  "perspective_a_name": "Short name for the left/progressive perspective (2-4 words)",
  "perspective_a": "3-4 sentence summary of the left/progressive take on this story",
  "perspective_a_claims": ["claim 1", "claim 2", "claim 3"],
  "perspective_b_name": "Short name for the right/conservative perspective (2-4 words)",
  "perspective_b": "3-4 sentence summary of the right/conservative take on this story",
  "perspective_b_claims": ["claim 1", "claim 2", "claim 3"],
  "what_happened": "3-4 sentence neutral factual summary with no opinion",
  "what_happened_timeline": ["event 1", "event 2", "event 3"],
  "key_differences_cause": "One sentence explaining why people disagree on the cause",
  "key_differences_impact": "One sentence explaining why people disagree on the impact",
  "sources": "comma separated list of source names used"
}`;
}

function buildPostsPrompt(story: StoryGenerationResponse): string {
  return `Generate 10 short social media posts (like tweets) from fictional users reacting to this news story. Make them sound like real people — casual, opinionated, 1-3 sentences each. Use varied names.

Story: ${story.title}
Perspective A (${story.perspective_a_name}): ${story.perspective_a}
Perspective B (${story.perspective_b_name}): ${story.perspective_b}

Rules:
- Make the split feel natural and uneven — not exactly 5/5. It could be 6/4, 7/3, 4/6 etc — vary it randomly
- Perspective A posts should reflect the left/progressive view
- Perspective B posts should reflect the right/conservative view
- Posts should sound like real humans, not AI summaries
- Vary the tone — some passionate, some sarcastic, some thoughtful

Return ONLY valid JSON:
{
  "posts": [
    { "display_name": "string", "content": "string", "perspective": "A" or "B" }
  ]
}`;
}

function buildDedupPrompt(stories: { title: string; summary: string; category: string }[]): string {
  const list = stories
    .map((s, i) => `${i}. [${s.category}] ${s.title} — ${s.summary}`)
    .join("\n");

  return `Below is a list of news stories currently live on FullScope. Some may be duplicates or near-duplicates that were generated separately, describing the exact same real-world event with different wording.

Identify groups of 2 or more stories that describe the SAME specific event. Only group stories that are clearly duplicates of one incident — do not group stories that just share a general topic (e.g. two different days of an ongoing war, or two different games in the same tournament, are NOT duplicates unless they cover the identical incident).

Return ONLY valid JSON, no other text:
{
  "duplicate_groups": [
    { "story_indices": [3, 7] }
  ]
}

If there are no duplicates, return { "duplicate_groups": [] }.

Stories:
${list}`;
}

async function getStoryCount(supabase: SupabaseAdmin): Promise<number> {
  const { count } = await supabase.from("stories").select("id", { count: "exact", head: true });
  return count ?? 0;
}

/** Marks a cluster's source articles processed immediately after it's been
 * attempted (success, clean skip, or generation error) — rather than
 * batching this at the very end of the whole run — so an interrupted run
 * (e.g. a platform timeout) can't leave articles unprocessed and get
 * re-clustered into a near-duplicate story on the next run. That's exactly
 * how the "Van Attack..." / "Van Rams Crowd..." duplicate happened. */
async function markClusterProcessed(supabase: SupabaseAdmin, articles: RawArticleRow[]): Promise<void> {
  const leanGroups = new Map<string, string[]>();
  for (const article of articles) {
    const group = leanGroups.get(article.source_lean) ?? [];
    group.push(article.id);
    leanGroups.set(article.source_lean, group);
  }

  for (const [lean, ids] of leanGroups) {
    const { error } = await supabase
      .from("raw_articles")
      .update({ processed: true, perspective_lean: lean })
      .in("id", ids);
    if (error) console.error(`Error marking articles processed for lean "${lean}":`, error.message);
  }
}

/** Phase E — scans every current story for near-duplicates (same real-world
 * event, generated separately) and merges each group down to the most
 * recently generated one, deleting the rest (their posts cascade-delete
 * with them). Runs every time, independent of whether today's fetch found
 * anything new, since duplicates can already exist from past runs. */
async function dedupeStories(
  supabase: SupabaseAdmin,
): Promise<{ mergedCount: number; removed: { title: string }[] }> {
  const { data: allStories, error } = await supabase
    .from("stories")
    .select("id, title, summary, category, generated_at")
    .order("generated_at", { ascending: false });

  if (error) {
    console.error("Error fetching stories for dedup check:", error.message);
    return { mergedCount: 0, removed: [] };
  }
  if (!allStories || allStories.length < 2) return { mergedCount: 0, removed: [] };

  let parsed: DedupResponse;
  try {
    const raw = await callClaude(buildDedupPrompt(allStories), 1500);
    parsed = parseClaudeJson<DedupResponse>(raw);
  } catch (err) {
    console.error("Error checking for duplicate stories:", describeError(err));
    return { mergedCount: 0, removed: [] };
  }

  const removed: { title: string }[] = [];

  for (const group of parsed.duplicate_groups ?? []) {
    const rows = (group.story_indices ?? [])
      .map((i) => allStories[i])
      .filter((row): row is (typeof allStories)[number] => Boolean(row));
    if (rows.length < 2) continue;

    // allStories is already newest-first, so keep the first (most recent —
    // usually the more complete/updated account of the event).
    const [, ...duplicates] = rows.sort((a, b) => (a.generated_at < b.generated_at ? 1 : -1));

    for (const dup of duplicates) {
      const { error: deleteError } = await supabase.from("stories").delete().eq("id", dup.id);
      if (deleteError) {
        console.error(`Error deleting duplicate story "${dup.title}":`, deleteError.message);
        continue;
      }
      removed.push({ title: dup.title });
      console.log(`Merged duplicate story: removed "${dup.title}"`);
    }
  }

  return { mergedCount: removed.length, removed };
}

/** Backfills a photo for any story that doesn't have one yet — covers
 * stories generated before Pexels was wired in, and any story where the
 * lookup came up empty at generation time. Cheap (Pexels is free) and the
 * story count is capped low enough that this is never more than a handful
 * of requests per run. */
async function backfillMissingImages(supabase: SupabaseAdmin): Promise<number> {
  const { data: rows, error } = await supabase
    .from("stories")
    .select("id, title, category")
    .is("image_url", null);

  if (error) {
    console.error("Error fetching stories missing images:", error.message);
    return 0;
  }
  if (!rows || rows.length === 0) return 0;

  let backfilled = 0;
  for (const row of rows) {
    const imageUrl = await findStoryImage(row.title, row.category);
    if (!imageUrl) continue;

    const { error: updateError } = await supabase
      .from("stories")
      .update({ image_url: imageUrl })
      .eq("id", row.id);

    if (updateError) {
      console.error(`Error saving backfilled image for "${row.title}":`, updateError.message);
      continue;
    }
    backfilled += 1;
  }

  if (backfilled > 0) console.log(`Backfilled images for ${backfilled} existing stories`);
  return backfilled;
}

export async function processArticles(): Promise<ProcessArticlesResult> {
  const supabase = createProcessingClient();

  let processedCount = 0;
  let newStoryCount = 0;
  const addedStories: { title: string; category: string }[] = [];
  const removedStories: { title: string }[] = [];

  const { data: articles, error: fetchError } = await supabase
    .from("raw_articles")
    .select("id, source_name, source_lean, title, description, published_at")
    .eq("processed", false)
    .order("published_at", { ascending: false })
    .limit(1000);

  if (fetchError) {
    console.error("Error fetching unprocessed articles:", fetchError.message);
  } else {
    const unprocessed = (articles ?? []) as RawArticleRow[];

    if (unprocessed.length < 5) {
      console.log("Not enough new articles to process");
    } else {
      // Phase A — topic clustering
      let clusters: ClusterResult[] = [];
      try {
        const raw = await callClaude(buildClusteringPrompt(unprocessed), 4000);
        const clusteringResponse = parseClaudeJson<ClusteringResponse>(raw);
        clusters = (clusteringResponse.clusters ?? []).filter(
          (c) => Array.isArray(c.article_indices) && c.article_indices.length >= 2,
        );
      } catch (err) {
        console.error("Error clustering articles:", describeError(err));
      }

      // Tag topic_cluster on member rows immediately (Phase A step 5)
      for (const cluster of clusters) {
        const ids = cluster.article_indices
          .map((i) => unprocessed[i]?.id)
          .filter((id): id is string => Boolean(id));
        if (ids.length === 0) continue;

        const { error } = await supabase
          .from("raw_articles")
          .update({ topic_cluster: cluster.topic_name })
          .in("id", ids);
        if (error) console.error(`Error tagging topic_cluster for "${cluster.topic_name}":`, error.message);
      }

      // Phase B + C — story + post generation. Sequential (not Promise.all):
      // the story-cap check-then-maybe-delete-oldest below has to see each
      // previous insert/delete before the next cluster runs, or two
      // clusters could both pass the cap check and push the count past it.
      for (const cluster of clusters) {
        const clusterArticles = cluster.article_indices
          .map((i) => unprocessed[i])
          .filter((a): a is RawArticleRow => Boolean(a));

        processedCount += clusterArticles.length;

        const distinctSources = new Set(clusterArticles.map((a) => a.source_name));
        if (distinctSources.size < 2) {
          console.log(`Skipping cluster "${cluster.topic_name}" — fewer than 2 distinct sources`);
          await markClusterProcessed(supabase, clusterArticles);
          continue;
        }

        try {
          const { count, error: countError } = await supabase
            .from("stories")
            .select("id", { count: "exact", head: true });
          if (countError) throw countError;

          if ((count ?? 0) >= MAX_STORIES) {
            const { data: oldest, error: oldestError } = await supabase
              .from("stories")
              .select("id, title")
              .order("generated_at", { ascending: true, nullsFirst: true })
              .limit(1)
              .maybeSingle();
            if (oldestError) throw oldestError;

            if (oldest) {
              await supabase.from("stories").delete().eq("id", oldest.id);
              removedStories.push({ title: oldest.title });
            }
          }

          const storyRaw = await callClaude(buildStoryPrompt(cluster.topic_name, clusterArticles), 3000);
          const story = parseClaudeJson<StoryGenerationResponse>(storyRaw);

          const mostRecentPublishedAt = clusterArticles
            .map((a) => a.published_at)
            .filter((d): d is string => Boolean(d))
            .sort()
            .at(-1);

          const imageUrl = await findStoryImage(story.title, story.category);

          const storyRow = {
            slug: slugify(story.title),
            title: story.title,
            category: story.category,
            summary: story.summary,
            what_happened: story.what_happened,
            timeline: story.what_happened_timeline.map((text) => ({ text, confidence: "reported" })),
            perspective_a: {
              name: story.perspective_a_name,
              summary: story.perspective_a,
              claims: story.perspective_a_claims,
            },
            perspective_b: {
              name: story.perspective_b_name,
              summary: story.perspective_b,
              claims: story.perspective_b_claims,
            },
            key_differences_cause: story.key_differences_cause,
            key_differences_impact: story.key_differences_impact,
            sources: story.sources
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .map((publisher) => ({ publisher })),
            published_at: mostRecentPublishedAt ?? new Date().toISOString(),
            generated_at: new Date().toISOString(),
            image_url: imageUrl,
          };

          const { data: insertedStory, error: insertError } = await supabase
            .from("stories")
            .insert(storyRow)
            .select("id")
            .single();

          if (insertError) throw insertError;

          newStoryCount += 1;
          addedStories.push({ title: story.title, category: story.category });
          console.log(`Created story "${story.title}" (${insertedStory.id})`);

          // Phase C — posts. Best-effort: keep the story even if this fails.
          try {
            const postsRaw = await callClaude(buildPostsPrompt(story), 2000);
            const { posts } = parseClaudeJson<PostGenerationResponse>(postsRaw);

            const postRows = (posts ?? [])
              .filter((p) => p.perspective === "A" || p.perspective === "B")
              .map((p) => ({
                story_id: insertedStory.id,
                display_name: p.display_name,
                perspective: p.perspective,
                content: p.content,
                is_generated: true,
                like_count: 0,
                reply_count: 0,
              }));

            if (postRows.length > 0) {
              const { error: postsError } = await supabase.from("posts").insert(postRows);
              if (postsError) throw postsError;
            }

            console.log(`Generated ${postRows.length} posts for "${story.title}"`);
          } catch (postErr) {
            console.error(
              `Error generating posts for "${story.title}" — story kept, posts skipped:`,
              describeError(postErr),
            );
          }

          await markClusterProcessed(supabase, clusterArticles);
        } catch (err) {
          console.error(`Error generating story for cluster "${cluster.topic_name}":`, describeError(err));
          await markClusterProcessed(supabase, clusterArticles);
          continue;
        }
      }
    }
  }

  // Phase E — dedup pass. Always runs, independent of whether today's fetch
  // found anything new, since duplicates can exist from past runs.
  const dedupResult = await dedupeStories(supabase);
  removedStories.push(...dedupResult.removed);

  // Phase F — backfill photos for any story that doesn't have one yet.
  await backfillMissingImages(supabase);

  const totalStories = await getStoryCount(supabase);
  console.log(
    `Processed ${processedCount} articles, created ${newStoryCount} new stories, merged ${dedupResult.mergedCount} duplicates, total stories now: ${totalStories}`,
  );

  if (addedStories.length > 0 || removedStories.length > 0) {
    await sendPipelineSummaryEmail({ added: addedStories, removed: removedStories, totalStories });
  }

  return { processedCount, newStoryCount, mergedDuplicateCount: dedupResult.mergedCount, totalStories };
}
