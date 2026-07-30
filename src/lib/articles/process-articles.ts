import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { callClaude, parseClaudeJson } from "./claude";
import { findStoryImage } from "./pexels";
import { sendPipelineSummaryEmail } from "../notifications/email";
import { recordPipelineHeartbeat } from "./pipeline-health";
import { logStoryUpdate } from "./story-updates";
import { LOCALE } from "../locale";
import { ACTIVE_FEEDS } from "../rss/fetch-rss";

/** raw_articles is a shared table across locales — without this, leftover
 * English-sourced rows from before a locale switch (or vice versa) would
 * mix into the clustering batch alongside the active locale's sources. */
const ACTIVE_SOURCE_NAMES = ACTIVE_FEEDS.map((feed) => feed.name);

/** Appended to every Claude prompt in Hebrew mode — keeps JSON keys in
 * English (the app's schema expects them) while all text values come back
 * in Hebrew. */
const HEBREW_OUTPUT_INSTRUCTION =
  "\n\nWrite every text VALUE in the JSON response in Hebrew. Keep the JSON keys exactly as specified (in English) — only the values should be Hebrew. IMPORTANT: Hebrew abbreviations (e.g. בג\"ץ, ח\"כ, צה\"ל) use the gershayim character ״ (U+05F4), NOT a straight ASCII quote mark (\") — using a straight quote inside a JSON string breaks the JSON. Always use ״ for Hebrew abbreviations.";

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

/** Story generation is sequential per cluster (~60-105s each, observed live:
 * 19 stories in 24m48s) — that has to stay sequential since each one checks
 * and enforces the MAX_STORIES cap before the next runs. A large backlog (a
 * quiet day, or a previous run getting cut off) can produce more clusters
 * than fit in any fixed timeout. Rather than raising the timeout indefinitely,
 * cap how many get generated per run so runtime stays predictable — anything
 * left over simply stays "unprocessed" and gets picked up by the next run
 * (see the cron schedule in process-articles.yml, which now runs every few
 * hours instead of once a day specifically so a big backlog clears within
 * the same day instead of waiting 24h). */
const MAX_CLUSTERS_PER_RUN = 10;

/** How many unprocessed articles get sent to a single clustering call.
 * Previously uncapped (fetched up to 1000) — with a large backlog (2000+
 * unprocessed articles, observed in production 2026-07-30), Claude enumerates
 * enough clusters that the JSON response exceeds any reasonable max_tokens
 * ceiling and gets truncated mid-string, silently discarding the entire
 * clustering pass for that run (doubling max_tokens from 4000 to 8000 only
 * moved the truncation point further out, not fixed it — the response size
 * scales with backlog size, not a fixed constant). Capping the *input* bounds
 * the output size predictably regardless of backlog. Most-recent articles are
 * fetched first, so this doesn't starve anything — whatever doesn't fit
 * simply stays unprocessed and is picked up by the next run, same rollover
 * behavior as MAX_CLUSTERS_PER_RUN. */
const MAX_ARTICLES_PER_CLUSTERING_PASS = 150;

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
  has_genuine_dispute: boolean;
  /** 1-5, how significant/substantive the disagreement is — only
   * meaningful when has_genuine_dispute is true. Used as a ranking
   * tiebreaker (see the cluster sort below), not a filter on its own. */
  dispute_intensity: number;
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
  image_keywords: string;
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

/** A live or archived story fetched as a candidate match for new coverage —
 * enough fields to both prompt Claude with and, if it's a match, apply the
 * update directly without a second fetch. */
interface RelatedStoryCandidate {
  id: string;
  slug: string;
  title: string;
  summary: string;
  archived_at: string | null;
  timeline: unknown;
  sources: unknown;
  published_at: string;
}

interface RelatedCheckResponse {
  action: "new" | "update";
  story_index?: number;
  new_development?: string;
}

export interface ProcessArticlesResult {
  processedCount: number;
  newStoryCount: number;
  updatedStoryCount: number;
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

/** Keeps any Unicode letter/number (not just a-z0-9) so non-Latin titles
 * (Hebrew, etc.) still produce a meaningful slug instead of just the random
 * suffix — `[^a-z0-9]` alone strips every character out of a Hebrew title. */
function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

function buildClusteringPrompt(articles: RawArticleRow[], maxClusters: number): string {
  const list = articles
    .map((a, i) => `${i}. ${a.source_name} (${a.source_lean}): ${a.title} — ${a.description ?? ""}`)
    .join("\n");

  return `You are a news editor. Below are news article headlines and summaries fetched from multiple sources today. Group them into topic clusters — stories that are about the same real-world event or issue.

Rules:
- Only create a cluster if at least 2 articles from DIFFERENT sources cover the same topic
- Ignore articles that don't have at least one other article covering the same topic
- Return AT MOST ${maxClusters} clusters — the ${maxClusters} most significant ones, ranked by how many distinct sources are covering them (the most-corroborated, most "trending" stories). Do not enumerate every possible cluster you can find; only return your top ${maxClusters}.
- Give each cluster a short descriptive name (e.g. 'Iran War Escalation', 'Spain World Cup Win', 'Tate Brothers Arrest')
- For each cluster, set "has_genuine_dispute" to true only if it's a story where real people or groups substantively disagree — about what happened, who's responsible, or what should happen next. This applies to ANY topic, not just politics — a genuine dispute can be about business (a contested merger, disputed layoffs, a boardroom fight, an activist investor campaign), sports (a disputed referee call, a doping accusation, a bitter contract/transfer dispute, a coaching controversy), entertainment/culture, science or technology (a contested study, an ethics debate over new tech), law, or politics/security (a policy debate, a contested decision, a controversial use of force, a disputed ruling) — treat all of these as equally eligible. Set it to false for a routine report with a clear, undisputed outcome and no real controversy, regardless of topic (e.g. an arrest with no dispute about what happened, a traffic accident, someone hospitalized, a routine business earnings report, a final sports score nobody is contesting, a routine indictment) — these don't have two honest sides to represent, and forcing one produces a fake, manufactured disagreement.
- For each cluster where "has_genuine_dispute" is true, set "dispute_intensity" to a number 1-5 rating how significant and substantive the disagreement actually is: 1 is a minor procedural or technical disagreement few people care about, 5 is a major clash of values or policy with broad public significance. For clusters where "has_genuine_dispute" is false, set "dispute_intensity" to 0.
- Return ONLY valid JSON, no other text

Return this exact JSON structure:
{
  "clusters": [
    {
      "topic_name": "string",
      "category": "Politics|World|Technology|Science",
      "has_genuine_dispute": true,
      "dispute_intensity": 4,
      "article_indices": [0, 3, 7]
    }
  ]
}

Articles:
${list}${LOCALE === "he" ? "\n\nWrite each \"topic_name\" in Hebrew. Keep JSON keys, the \"category\" value, and the \"has_genuine_dispute\" value in English exactly as specified." : ""}`;
}

/** Ranking key for picking which clusters to actually generate, priority
 * order: (1) distinct source count — how independently corroborated the
 * story is; (2) dispute intensity — how significant the disagreement is,
 * from Claude's own rating; (3) total article text volume — how much has
 * actually been reported, a cheap local proxy for substance that doesn't
 * need another model call. Source count and dispute intensity come from
 * the clustering response; text volume is computed directly from the
 * already-fetched article rows rather than asked of the model. */
function clusterRankKey(cluster: ClusterResult, unprocessed: RawArticleRow[]): [number, number, number] {
  const clusterArticles = cluster.article_indices
    .map((i) => unprocessed[i])
    .filter((a): a is RawArticleRow => Boolean(a));
  const distinctSourceCount = new Set(clusterArticles.map((a) => a.source_name)).size;
  const totalTextLength = clusterArticles.reduce(
    (sum, a) => sum + a.title.length + (a.description?.length ?? 0),
    0,
  );
  return [distinctSourceCount, cluster.dispute_intensity ?? 0, totalTextLength];
}

export function buildStoryPrompt(topicName: string, articles: RawArticleRow[]): string {
  const list = articles
    .map((a) => `${a.source_name} (${a.source_lean}): ${a.title} — ${a.description ?? ""}`)
    .join("\n");

  // US news maps reasonably well onto a left/progressive vs. right/conservative
  // axis; Israeli politics doesn't (religious/secular, hawkish/dovish on
  // security, coalition/opposition, etc. are all more relevant depending on
  // the story). In Hebrew mode, let Claude pick whichever two real,
  // substantively different perspectives actually divide people on THIS
  // specific story, instead of forcing a US label onto it.
  // Naming the STANCE ("security-first response") instead of the GROUP
  // holding it ("the right", "settlers") is the actual neutrality lever here
  // — group labels are inherently more loaded than argument labels, and a
  // prompt that only says "name the perspective" drifts between the two
  // per story, often landing on an asymmetric mix (one side named by its
  // argument, the other by a political/demographic label) that reads as
  // biased even when the underlying content isn't.
  const nameNeutrality = `Name each perspective by the STANCE or ARGUMENT it makes, never by the group/identity holding it — e.g. "security-first response" or "restraint and de-escalation", not "the right", "the left", a political party, or a demographic label (settlers, Haredim, etc.). Phrase both names with the same register and specificity so neither side reads as the neutral default and the other as a loaded label.`;

  const perspectiveInstructions =
    LOCALE === "he"
      ? `- Identify the two most relevant, real perspectives that actually divide people on THIS specific story. The axis does NOT have to be political — pick whichever real divide genuinely fits the topic. For example (not exhaustive): security-first vs. rights-first, religious vs. secular, coalition vs. opposition, hawkish vs. dovish (politics/security); management vs. labor or shareholders, growth-at-all-costs vs. fiscal caution, innovation vs. regulatory caution (business/tech); a team's or player's defenders vs. critics, tradition vs. reform, competitive fairness vs. commercial interest (sports); or whatever real disagreement fits a legal, scientific, or cultural story. Do not force a generic left/right or political label onto a story that isn't actually political.
- "perspective_a_name"/"perspective_b_name": short name (2-4 words) for each actual perspective. ${nameNeutrality}`
      : `- "perspective_a_name": short name (2-4 words) for the left/progressive stance on this specific story
- "perspective_b_name": short name (2-4 words) for the right/conservative stance on this specific story
- ${nameNeutrality}`;

  return `You are a news editor for FullScope, a news platform that shows every story from multiple perspectives. Based on the following articles about ${topicName}, generate a complete story entry.

Articles provided:
${list}

${perspectiveInstructions}

Return ONLY valid JSON with this exact structure:
{
  "title": "Engaging, objective headline under 15 words, no question mark at end",
  "summary": "2 sentence neutral summary of what happened",
  "category": "Politics|World|Technology|Science",
  "perspective_a_name": "string",
  "perspective_a": "3-4 sentence summary of this perspective's take on the story",
  "perspective_a_claims": ["claim 1", "claim 2", "claim 3"],
  "perspective_b_name": "string",
  "perspective_b": "3-4 sentence summary of this perspective's take on the story",
  "perspective_b_claims": ["claim 1", "claim 2", "claim 3"],
  "what_happened": "3-4 sentence neutral factual summary with no opinion",
  "what_happened_timeline": ["event 1", "event 2", "event 3"],
  "key_differences_cause": "One sentence explaining why people disagree on the cause",
  "key_differences_impact": "One sentence explaining why people disagree on the impact",
  "sources": "comma separated list of source names used",
  "image_keywords": "2-5 word phrase in ENGLISH (regardless of what language the rest of this response is in) describing a concrete, photographable visual scene for this story — e.g. 'soldier military funeral', 'wildfire forest smoke', 'stock market trading floor'. This is used to search a stock photo library, which only understands English, so it must always be English even when everything else is Hebrew."
}${LOCALE === "he" ? HEBREW_OUTPUT_INSTRUCTION : ""}`;
}

function buildPostsPrompt(story: StoryGenerationResponse): string {
  return `Generate 10 short social media posts (like tweets) from fictional users reacting to this news story. Make them sound like real people — casual, opinionated, 1-3 sentences each. Use varied names${LOCALE === "he" ? " (realistic Hebrew/Israeli names)" : ""}.

Story: ${story.title}
Perspective A (${story.perspective_a_name}): ${story.perspective_a}
Perspective B (${story.perspective_b_name}): ${story.perspective_b}

Rules:
- Make the split feel natural and uneven — not exactly 5/5. It could be 6/4, 7/3, 4/6 etc — vary it randomly
- Perspective A posts should reflect the "${story.perspective_a_name}" view
- Perspective B posts should reflect the "${story.perspective_b_name}" view
- Posts should sound like real humans, not AI summaries
- Vary the tone — some passionate, some sarcastic, some thoughtful

Return ONLY valid JSON:
{
  "posts": [
    { "display_name": "string", "content": "string", "perspective": "A" or "B" }
  ]
}${LOCALE === "he" ? HEBREW_OUTPUT_INSTRUCTION : ""}`;
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

/** Distinct from buildDedupPrompt: dedup compares stories generated on the
 * SAME run against each other (identical event, generated twice). This
 * compares TODAY's new coverage against the existing body of stories,
 * asking whether it's a continuation of an ongoing situation rather than a
 * fresh, separate incident — deliberately biased toward "new" on any doubt,
 * since an incorrect "update" corrupts an unrelated story's content, while
 * an incorrect "new" just creates an extra story the next dedup pass can
 * still catch. */
function buildRelatedStoryPrompt(
  candidates: RelatedStoryCandidate[],
  clusterTopic: string,
  articles: RawArticleRow[],
): string {
  const candidateList = candidates
    .map((c, i) => `${i}. [${c.archived_at ? "archived" : "live"}] ${c.title} — ${c.summary}`)
    .join("\n");
  const articleList = articles
    .map((a) => `${a.source_name}: ${a.title} — ${a.description ?? ""}`)
    .join("\n");

  return `You are a news editor. New coverage was just found about "${clusterTopic}":
${articleList}

Below are existing stories already on FullScope in the same category (some may be archived — no longer on the main feed, but still real stories):
${candidateList}

Decide: is this new coverage a DEVELOPMENT of one of these SAME ongoing real-world stories or situations (continuing over time), or is it a genuinely NEW, distinct story or incident?

Only choose "update" if you're confident it's the same ongoing story — not just a similar topic, a separate-but-related incident, or a recurring type of event (e.g. two different terror attacks, two different court rulings, are NOT the same story even if similar). When in doubt, choose "new".

Return ONLY valid JSON, no other text:
{"action": "new"}
or
{"action": "update", "story_index": 0, "new_development": "one clear sentence describing what's new"${
    LOCALE === "he" ? ", written in Hebrew" : ""
  }}`;
}

/** Live (non-archived) story count — the number the MAX_STORIES cap is
 * measured against. Archived stories don't count toward it; they're already
 * out of the feed. */
async function getStoryCount(supabase: SupabaseAdmin): Promise<number> {
  const { count } = await supabase
    .from("stories")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null);
  return count ?? 0;
}

/** Removes a story from the main feed without deleting it — its posts,
 * likes, and contributions all stay intact, and it becomes visible in the
 * Home page's History tab instead of disappearing entirely. */
async function archiveStory(supabase: SupabaseAdmin, id: string): Promise<{ error: { message: string } | null }> {
  const { error } = await supabase.from("stories").update({ archived_at: new Date().toISOString() }).eq("id", id);
  return { error };
}

/** Checks whether a new cluster is really a development of an existing story
 * (live or archived) rather than a distinct new one. Candidates are scoped
 * to the same category and capped at 15 (10 live + 5 archived, live
 * prioritized as more likely relevant) to keep the prompt small. Returns
 * null — meaning "treat as new" — whenever there's nothing to compare
 * against or the check itself fails; this is a best-effort optimization,
 * never something that should block story generation. */
async function findRelatedStory(
  supabase: SupabaseAdmin,
  category: string,
  clusterTopic: string,
  clusterArticles: RawArticleRow[],
): Promise<{ candidate: RelatedStoryCandidate; newDevelopment: string } | null> {
  const candidateFields = "id, slug, title, summary, archived_at, timeline, sources, published_at";

  const { data: live } = await supabase
    .from("stories")
    .select(candidateFields)
    .eq("category", category)
    .is("archived_at", null)
    .order("generated_at", { ascending: false })
    .limit(10);

  const { data: archived } = await supabase
    .from("stories")
    .select(candidateFields)
    .eq("category", category)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })
    .limit(5);

  const candidates = [...(live ?? []), ...(archived ?? [])] as unknown as RelatedStoryCandidate[];
  if (candidates.length === 0) return null;

  try {
    const raw = await callClaude(buildRelatedStoryPrompt(candidates, clusterTopic, clusterArticles), 500);
    const parsed = parseClaudeJson<RelatedCheckResponse>(raw);
    if (parsed.action !== "update" || parsed.story_index === undefined || !parsed.new_development) return null;

    const candidate = candidates[parsed.story_index];
    if (!candidate) return null;

    return { candidate, newDevelopment: parsed.new_development };
  } catch (err) {
    console.error(`Error checking related stories for "${clusterTopic}":`, describeError(err));
    return null;
  }
}

/** Folds new coverage into an existing story instead of generating a
 * duplicate: appends a timeline entry, merges in any newly-seen source
 * names, extends published_at if the new articles are more recent, and
 * revives the story (clears archived_at) if it had aged out or been merged
 * away — this is how an archived story can come back with new context. */
async function applyCoverageUpdate(
  supabase: SupabaseAdmin,
  candidate: RelatedStoryCandidate,
  clusterArticles: RawArticleRow[],
  newDevelopment: string,
): Promise<void> {
  const existingTimeline = Array.isArray(candidate.timeline)
    ? (candidate.timeline as { text: string; confidence: string }[])
    : [];
  const updatedTimeline = [...existingTimeline, { text: newDevelopment, confidence: "reported" }];

  const existingSources = Array.isArray(candidate.sources)
    ? (candidate.sources as { publisher: string }[])
    : [];
  const existingPublishers = new Set(existingSources.map((s) => s.publisher));
  const newPublishers = [...new Set(clusterArticles.map((a) => a.source_name))].filter(
    (name) => !existingPublishers.has(name),
  );
  const updatedSources = [...existingSources, ...newPublishers.map((publisher) => ({ publisher }))];

  const mostRecentPublishedAt = clusterArticles
    .map((a) => a.published_at)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);
  const updatedPublishedAt =
    mostRecentPublishedAt && mostRecentPublishedAt > candidate.published_at
      ? mostRecentPublishedAt
      : candidate.published_at;

  const { error } = await supabase
    .from("stories")
    .update({
      timeline: updatedTimeline,
      sources: updatedSources,
      published_at: updatedPublishedAt,
      archived_at: null,
    })
    .eq("id", candidate.id);

  if (error) {
    console.error(`Error applying coverage update to "${candidate.title}":`, error.message);
    return;
  }

  await logStoryUpdate(supabase, {
    storyId: candidate.id,
    storySlug: candidate.slug,
    updateType: "coverage",
    summary: newDevelopment,
  });

  const revivedNote = candidate.archived_at ? " (revived from archive)" : "";
  console.log(`Folded new coverage into existing story "${candidate.title}"${revivedNote}`);
}

/** The per-cluster cap check in the main loop below only swaps one-for-one
 * once already AT the cap — it never shrinks the count back down if it's
 * already OVER the cap (e.g. from stories inserted outside this pipeline,
 * like seed data). That let the story count drift up to 79 and just sit
 * there indefinitely. This runs once per invocation as a hard backstop:
 * whatever the count is, trim the oldest rows until it's at MAX_STORIES. */
async function enforceStoryCap(supabase: SupabaseAdmin): Promise<{ title: string }[]> {
  const count = await getStoryCount(supabase);
  const overshoot = count - MAX_STORIES;
  if (overshoot <= 0) return [];

  const { data: toRemove, error } = await supabase
    .from("stories")
    .select("id, title")
    .is("archived_at", null)
    .order("generated_at", { ascending: true, nullsFirst: true })
    .limit(overshoot);

  if (error) {
    console.error("Error fetching overshoot stories for cap enforcement:", error.message);
    return [];
  }
  if (!toRemove || toRemove.length === 0) return [];

  const archived: { title: string }[] = [];
  for (const row of toRemove) {
    const { error: archiveError } = await archiveStory(supabase, row.id);
    if (archiveError) {
      console.error(`Error archiving overshoot story "${row.title}":`, archiveError.message);
      continue;
    }
    archived.push({ title: row.title });
  }

  console.log(`Archived ${archived.length} stories to enforce the ${MAX_STORIES}-story cap`);
  return archived;
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
    .select("id, slug, title, summary, category, generated_at")
    .is("archived_at", null)
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
    const [survivor, ...duplicates] = rows.sort((a, b) => (a.generated_at < b.generated_at ? 1 : -1));

    const actuallyRemoved: string[] = [];
    for (const dup of duplicates) {
      const { error: archiveError } = await archiveStory(supabase, dup.id);
      if (archiveError) {
        console.error(`Error archiving duplicate story "${dup.title}":`, archiveError.message);
        continue;
      }
      removed.push({ title: dup.title });
      actuallyRemoved.push(dup.title);
      console.log(`Merged duplicate story: archived "${dup.title}"`);
    }

    if (actuallyRemoved.length > 0) {
      await logStoryUpdate(supabase, {
        storyId: survivor.id,
        storySlug: survivor.slug,
        updateType: "merge",
        summary:
          LOCALE === "he"
            ? `דווח גם על ידי: ${actuallyRemoved.join(", ")}`
            : `Merged with duplicate coverage: ${actuallyRemoved.join(", ")}`,
      });
    }
  }

  return { mergedCount: removed.length, removed };
}

/** Stories generated before `image_keywords` existed (or Hebrew stories from
 * before this fix) have no English search phrase to fall back on — this
 * derives one from the title+summary with a small, cheap Claude call.
 * Pexels' index is effectively English-only, so searching with a Hebrew (or
 * any non-English) title directly tends to return unrelated results rather
 * than a clean "no match" — this is what caused e.g. a bathroom photo on a
 * story about a soldier recognition ruling. */
async function deriveImageKeywords(title: string, summary: string): Promise<string | null> {
  try {
    const prompt = `Give a short (2-5 word) ENGLISH phrase describing a concrete, photographable visual scene for this news story — e.g. "soldier military funeral", "wildfire forest smoke", "stock market trading floor". Respond with ONLY the phrase, no punctuation, no quotes, no explanation, always in English regardless of the story's language.

Title: ${title}
Summary: ${summary}`;
    const raw = await callClaude(prompt, 30);
    const cleaned = raw.trim().replace(/^["']|["']$/g, "");
    return cleaned || null;
  } catch (err) {
    console.error("Error deriving image keywords:", describeError(err));
    return null;
  }
}

/** Backfills a photo for any story that doesn't have one yet — covers
 * stories generated before Pexels was wired in, and any story where the
 * lookup came up empty at generation time. Unlike the main generation loop,
 * these stories have no ordering dependency on each other (no shared cap
 * check), so they run concurrently — previously this was a sequential loop,
 * which meant every story that persistently fails to find a photo (retried
 * from scratch on every single run, forever) added its full round-trip time
 * on top of every other run, every day. That sequential cost was a real
 * contributor to process-articles.yml exceeding its GitHub Actions
 * timeout. */
async function backfillMissingImages(supabase: SupabaseAdmin): Promise<number> {
  const { data: rows, error } = await supabase
    .from("stories")
    .select("id, title, summary, category")
    .is("image_url", null)
    .is("archived_at", null);

  if (error) {
    console.error("Error fetching stories missing images:", error.message);
    return 0;
  }
  if (!rows || rows.length === 0) return 0;

  const results = await Promise.all(
    rows.map(async (row) => {
      const keywords = await deriveImageKeywords(row.title, row.summary);
      const imageUrl = await findStoryImage(keywords ?? row.title, row.category);
      if (!imageUrl) return false;

      const { error: updateError } = await supabase
        .from("stories")
        .update({ image_url: imageUrl })
        .eq("id", row.id);

      if (updateError) {
        console.error(`Error saving backfilled image for "${row.title}":`, updateError.message);
        return false;
      }
      return true;
    }),
  );

  const backfilled = results.filter(Boolean).length;
  if (backfilled > 0) console.log(`Backfilled images for ${backfilled} existing stories`);
  return backfilled;
}

/** Standalone entry point for backfilling story photos only — no clustering,
 * no story/post generation. Used to catch up existing stories after a gap
 * in Pexels access (e.g. PEXELS_API_KEY missing from an environment for a
 * while) without re-running the full daily pipeline. */
export async function backfillImagesOnly(): Promise<number> {
  const supabase = createProcessingClient();
  return backfillMissingImages(supabase);
}

export async function processArticles(): Promise<ProcessArticlesResult> {
  try {
    const result = await runProcessArticles();
    await recordPipelineHeartbeat(
      "success",
      `Processed ${result.processedCount} articles, created ${result.newStoryCount} stories, updated ${result.updatedStoryCount} existing stories, merged ${result.mergedDuplicateCount} duplicates, total ${result.totalStories}.`,
    );
    return result;
  } catch (err) {
    await recordPipelineHeartbeat("error", describeError(err));
    throw err;
  }
}

async function runProcessArticles(): Promise<ProcessArticlesResult> {
  const supabase = createProcessingClient();

  let processedCount = 0;
  let newStoryCount = 0;
  const addedStories: { title: string; category: string }[] = [];
  const updatedStories: { title: string; note: string }[] = [];
  const removedStories: { title: string }[] = [];

  const { data: articles, error: fetchError } = await supabase
    .from("raw_articles")
    .select("id, source_name, source_lean, title, description, published_at")
    .eq("processed", false)
    .in("source_name", ACTIVE_SOURCE_NAMES)
    .order("published_at", { ascending: false })
    .limit(MAX_ARTICLES_PER_CLUSTERING_PASS);

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
        // The prompt itself now asks Claude to return at most
        // MAX_CLUSTERS_PER_RUN clusters (the most-corroborated/"trending"
        // ones) rather than enumerating every cluster it can find — this is
        // the real fix for a 2026-07-30 production incident where a large
        // backlog (2000+ unprocessed articles) made Claude enumerate enough
        // clusters that the JSON response exceeded any reasonable
        // max_tokens ceiling and got truncated mid-string, silently
        // discarding the whole clustering pass. Raising max_tokens alone
        // only moved the truncation point further out (confirmed by
        // observation, not just reasoning) — response size scales with how
        // many clusters exist in the backlog, not a fixed constant, so a
        // fixed token ceiling can never fully solve it. Bounding the
        // request's own output is what actually bounds it. max_tokens is
        // still raised as a second line of defense in case the model
        // doesn't perfectly respect the "at most N" instruction.
        const raw = await callClaude(buildClusteringPrompt(unprocessed, MAX_CLUSTERS_PER_RUN), 8000);
        const clusteringResponse = parseClaudeJson<ClusteringResponse>(raw);
        const candidateClusters = (clusteringResponse.clusters ?? []).filter(
          (c) => Array.isArray(c.article_indices) && c.article_indices.length >= 2,
        );

        // Routine incident reports (an arrest, a traffic accident, someone
        // hospitalized) have no real dispute to represent — forcing two
        // perspectives onto them produces a fake, manufactured disagreement.
        // Reject them here, before generation, rather than letting the story
        // prompt invent sides that don't genuinely exist. Their source
        // articles are marked processed immediately so they're not
        // reconsidered (and rejected again) on every future run.
        const disputeClusters: ClusterResult[] = [];
        for (const cluster of candidateClusters) {
          if (cluster.has_genuine_dispute) {
            disputeClusters.push(cluster);
            continue;
          }
          const rejectedArticles = cluster.article_indices
            .map((i) => unprocessed[i])
            .filter((a): a is RawArticleRow => Boolean(a));
          console.log(`Skipping cluster "${cluster.topic_name}" — routine incident report, no genuine dispute`);
          await markClusterProcessed(supabase, rejectedArticles);
        }

        clusters = disputeClusters
          // Belt-and-suspenders: the prompt already asks for at most
          // MAX_CLUSTERS_PER_RUN, ranked by source count, but this is
          // enforced server-side too rather than trusted outright — same
          // "verify, don't just trust the prompt" pattern as trend
          // detection's distinct-user check. See clusterRankKey for the
          // full priority order (sources, then dispute intensity, then
          // article text volume).
          .sort((a, b) => {
            const keyA = clusterRankKey(a, unprocessed);
            const keyB = clusterRankKey(b, unprocessed);
            for (let i = 0; i < keyA.length; i++) {
              if (keyB[i] !== keyA[i]) return keyB[i] - keyA[i];
            }
            return 0;
          })
          .slice(0, MAX_CLUSTERS_PER_RUN);
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

        const related = await findRelatedStory(supabase, cluster.category, cluster.topic_name, clusterArticles);
        if (related) {
          await applyCoverageUpdate(supabase, related.candidate, clusterArticles, related.newDevelopment);
          updatedStories.push({ title: related.candidate.title, note: related.newDevelopment });
          await markClusterProcessed(supabase, clusterArticles);
          continue;
        }

        try {
          const { count, error: countError } = await supabase
            .from("stories")
            .select("id", { count: "exact", head: true })
            .is("archived_at", null);
          if (countError) throw countError;

          if ((count ?? 0) >= MAX_STORIES) {
            const { data: oldest, error: oldestError } = await supabase
              .from("stories")
              .select("id, title")
              .is("archived_at", null)
              .order("generated_at", { ascending: true, nullsFirst: true })
              .limit(1)
              .maybeSingle();
            if (oldestError) throw oldestError;

            if (oldest) {
              await archiveStory(supabase, oldest.id);
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

          const imageUrl = await findStoryImage(story.image_keywords, story.category);

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

  // Phase F — hard backstop: trim back down to MAX_STORIES if anything
  // (seed data, a past bug, etc.) pushed the count over it.
  removedStories.push(...(await enforceStoryCap(supabase)));

  // Phase G — backfill photos for any story that doesn't have one yet.
  await backfillMissingImages(supabase);

  const totalStories = await getStoryCount(supabase);
  console.log(
    `Processed ${processedCount} articles, created ${newStoryCount} new stories, updated ${updatedStories.length} existing stories, merged ${dedupResult.mergedCount} duplicates, total stories now: ${totalStories}`,
  );

  if (addedStories.length > 0 || updatedStories.length > 0 || removedStories.length > 0) {
    await sendPipelineSummaryEmail({
      added: addedStories,
      updated: updatedStories,
      removed: removedStories,
      totalStories,
    });
  }

  return {
    processedCount,
    newStoryCount,
    updatedStoryCount: updatedStories.length,
    mergedDuplicateCount: dedupResult.mergedCount,
    totalStories,
  };
}
