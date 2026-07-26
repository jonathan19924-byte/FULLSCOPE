import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { callClaude, parseClaudeJson } from "./claude";
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

export interface ProcessArticlesResult {
  processedCount: number;
  newStoryCount: number;
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

async function getStoryCount(supabase: SupabaseAdmin): Promise<number> {
  const { count } = await supabase.from("stories").select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function processArticles(): Promise<ProcessArticlesResult> {
  const supabase = createProcessingClient();

  const { data: articles, error: fetchError } = await supabase
    .from("raw_articles")
    .select("id, source_name, source_lean, title, description, published_at")
    .eq("processed", false)
    .order("published_at", { ascending: false })
    .limit(100);

  if (fetchError) {
    console.error("Error fetching unprocessed articles:", fetchError.message);
    return { processedCount: 0, newStoryCount: 0, totalStories: await getStoryCount(supabase) };
  }

  const unprocessed = (articles ?? []) as RawArticleRow[];

  if (unprocessed.length < 5) {
    console.log("Not enough new articles to process");
    return { processedCount: 0, newStoryCount: 0, totalStories: await getStoryCount(supabase) };
  }

  // Phase A — topic clustering
  let clusteringResponse: ClusteringResponse;
  try {
    const raw = await callClaude(buildClusteringPrompt(unprocessed), 2000);
    clusteringResponse = parseClaudeJson<ClusteringResponse>(raw);
  } catch (err) {
    console.error("Error clustering articles:", describeError(err));
    return { processedCount: 0, newStoryCount: 0, totalStories: await getStoryCount(supabase) };
  }

  const clusters = (clusteringResponse.clusters ?? []).filter(
    (c) => Array.isArray(c.article_indices) && c.article_indices.length >= 2,
  );

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

  // Phase B + C — story + post generation. Sequential (not Promise.all): the
  // 30-story cap check-then-maybe-delete-oldest below has to see each
  // previous insert/delete before the next cluster runs, or two clusters
  // could both pass the cap check and push the count past 30.
  let newStoryCount = 0;
  const clusteredArticleIds = new Set<string>();
  const addedStories: { title: string; category: string }[] = [];
  const removedStories: { title: string }[] = [];

  for (const cluster of clusters) {
    const clusterArticles = cluster.article_indices
      .map((i) => unprocessed[i])
      .filter((a): a is RawArticleRow => Boolean(a));

    for (const a of clusterArticles) clusteredArticleIds.add(a.id);

    const distinctSources = new Set(clusterArticles.map((a) => a.source_name));
    if (distinctSources.size < 2) {
      console.log(`Skipping cluster "${cluster.topic_name}" — fewer than 2 distinct sources`);
      continue;
    }

    try {
      const { count, error: countError } = await supabase
        .from("stories")
        .select("id", { count: "exact", head: true });
      if (countError) throw countError;

      if ((count ?? 0) >= 30) {
        const { data: oldest, error: oldestError } = await supabase
          .from("stories")
          .select("id, title")
          .order("generated_at", { ascending: true, nullsFirst: true })
          .limit(1)
          .maybeSingle();
        if (oldestError) throw oldestError;

        if (oldest) {
          await supabase.from("posts").delete().eq("story_id", oldest.id);
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
    } catch (err) {
      console.error(`Error generating story for cluster "${cluster.topic_name}":`, describeError(err));
      continue;
    }
  }

  // Phase D — mark every clustered article as processed, and copy source_lean
  // into perspective_lean (grouped, since a bulk update applies one value at
  // a time to a batch of ids).
  if (clusteredArticleIds.size > 0) {
    const leanGroups = new Map<string, string[]>();
    for (const id of clusteredArticleIds) {
      const article = unprocessed.find((a) => a.id === id);
      if (!article) continue;
      const group = leanGroups.get(article.source_lean) ?? [];
      group.push(id);
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

  const totalStories = await getStoryCount(supabase);
  console.log(
    `Processed ${clusteredArticleIds.size} articles, created ${newStoryCount} new stories, total stories now: ${totalStories}`,
  );

  if (addedStories.length > 0 || removedStories.length > 0) {
    await sendPipelineSummaryEmail({ added: addedStories, removed: removedStories, totalStories });
  }

  return { processedCount: clusteredArticleIds.size, newStoryCount, totalStories };
}
