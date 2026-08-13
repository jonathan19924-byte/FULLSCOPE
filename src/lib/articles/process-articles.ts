import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { callClaude, parseClaudeJson } from "./claude";
import { findStoryImage } from "./pexels";
import { fetchEntityContext, type EntitySummary } from "./wikipedia";
import { embedText, embedTexts, embedQuery, toPgVectorLiteral } from "./voyage";
import { sendPipelineSummaryEmail } from "../notifications/email";
import { recordPipelineHeartbeat } from "./pipeline-health";
import { logStoryUpdate } from "./story-updates";
import { LOCALE } from "../locale";
import { ACTIVE_FEEDS } from "../rss/fetch-rss";
import { TELEGRAM_CHANNELS } from "../rss/fetch-telegram";

/** raw_articles is a shared table across locales — without this, leftover
 * English-sourced rows from before a locale switch (or vice versa) would
 * mix into the clustering batch alongside the active locale's sources.
 * Telegram channels are Hebrew-only (added 2026-07-31), so they're only
 * included in the Hebrew-mode source list — same reasoning as HEBREW_FEEDS
 * itself only applying when LOCALE === "he". Every Telegram channel name is
 * added here so fetchUnprocessedArticles' per-source cap applies to them
 * too — otherwise a high-volume channel (e.g. Abu Ali Express at 588K
 * subscribers) could dominate a clustering pass the same way Kore almost
 * did before the per-source cap existed. */
const ACTIVE_SOURCE_NAMES = [
  ...ACTIVE_FEEDS.map((feed) => feed.name),
  ...(LOCALE === "he" ? TELEGRAM_CHANNELS.map((channel) => channel.name) : []),
];

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

/** How many unprocessed articles per SOURCE get sent to a single clustering
 * call (not a global total). Originally a single global limit (1000, then
 * 150 after a 2026-07-30 incident where a 2000+ article backlog made
 * Claude's clustering response exceed any reasonable max_tokens ceiling and
 * truncate mid-string, silently discarding the whole pass) — but a global
 * limit ordered by recency lets a handful of high-volume sources crowd out
 * everything else. Observed directly in production: with the old 150 global
 * cap, one source (Kore) alone filled 45% of the slots and 17 of 33 active
 * sources had zero representation at all. Capping per-source instead
 * guarantees every active source gets a fair shot each run, while the total
 * (source count × this number) still bounds the clustering response size the
 * same way the old global cap did. Whatever doesn't fit stays unprocessed
 * and rolls into the next run, same as before. */
const MAX_ARTICLES_PER_SOURCE_PER_PASS = 10;

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
  what_happened_timeline: { text: string; confidence: "confirmed" | "reported" | "disputed" | "unknown" }[];
  key_differences_cause: string;
  key_differences_impact: string;
  sources: string;
  image_keywords: string;
  entities: { people: string[]; companies: string[]; countries: string[] };
  location_name: string;
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

/** RSS descriptions are always short (1-3 sentences), but Telegram posts
 * (added 2026-07-31) can run to hundreds of words — a full statement rather
 * than a blurb. Uncapped, a handful of long posts in one cluster can bloat
 * a generation prompt enough to push Claude's response past its max_tokens
 * ceiling, silently truncating whichever output field is listed last (see
 * the Decision Log entry on the missing-"sources" bug this caused). Capping
 * input length here is the actual fix — raising max_tokens alone only moves
 * the truncation point further out, same lesson as the 2026-07-30
 * clustering truncation incident. */
const MAX_DESCRIPTION_CHARS_IN_PROMPT = 500;

function truncateDescription(description: string | null): string {
  if (!description) return "";
  return description.length > MAX_DESCRIPTION_CHARS_IN_PROMPT
    ? `${description.slice(0, MAX_DESCRIPTION_CHARS_IN_PROMPT)}…`
    : description;
}

/** Expanded from 4 to 9 categories (2026-08-02) after reviewing all 158 real
 * live+archived stories — "Politics" and "World" had become overloaded
 * catch-alls hiding several genuinely distinct, recurring clusters. See
 * CONTENT_PIPELINE.md for the full breakdown. Shared between the clustering
 * and story-generation prompts so both stay in sync. */
const CATEGORY_ENUM =
  "Politics|Security & Defense|Law & Courts|Crime & Safety|World|Business & Economy|Technology|Science|Society & Religion";

/** Without explicit guidance, a model defaults back to whichever broad
 * category it's more used to reaching for (observed directly in the
 * pre-2026-08-02 data: Iran/Hezbollah security news, court rulings, and
 * routine crime were all getting stuffed into "Politics" or "World" out of
 * habit) — this spells out what each new, more specific category is FOR so
 * generation actually uses them instead of the old fallback buckets. */
const CATEGORY_GUIDANCE = `Category guidance — use the MOST SPECIFIC category that genuinely fits, not a generic fallback:
- "Security & Defense": military operations, Iran/Hezbollah/regional conflict, IDF policy, defense diplomacy — not "World" or "Politics".
- "Law & Courts": court rulings, Supreme Court/Bagatz decisions, defamation suits, legal proceedings — not "Politics".
- "Crime & Safety": routine crime, arrests, accidents, missing persons, local incidents with no political or international dimension — not "World".
- "Business & Economy": markets, corporate deals, economic policy — not "Technology" (reserve "Technology" for tech products/companies/AI specifically) or "World".
- "Society & Religion": Haredi-secular relations, religious-vs-secular disputes, cultural/social tension — not "Politics" unless it's specifically about electoral/coalition politics.
- "Politics": domestic political process — elections, parties, coalition, Knesset.
- "World": genuine international news not covered by any of the above (not Israeli-security-specific).`;

function buildClusteringPrompt(articles: RawArticleRow[], maxClusters: number): string {
  const list = articles
    .map((a, i) => `${i}. ${a.source_name} (${a.source_lean}): ${a.title} — ${truncateDescription(a.description)}`)
    .join("\n");

  return `You are a news editor. Below are news article headlines and summaries fetched from multiple sources today. Group them into topic clusters — stories that are about the same real-world event or issue.

Rules:
- Only create a cluster if at least 2 articles from DIFFERENT sources cover the same topic
- Ignore articles that don't have at least one other article covering the same topic
- Return AT MOST ${maxClusters} clusters — the ${maxClusters} most significant ones, ranked by how many distinct sources are covering them (the most-corroborated, most "trending" stories). Do not enumerate every possible cluster you can find; only return your top ${maxClusters}.
- Give each cluster a short descriptive name (e.g. 'Iran War Escalation', 'Spain World Cup Win', 'Tate Brothers Arrest')
- For each cluster, set "has_genuine_dispute" to true only if it's a story where real people or groups substantively disagree — about what happened, who's responsible, or what should happen next. This applies to ANY topic, not just politics — a genuine dispute can be about business (a contested merger, disputed layoffs, a boardroom fight, an activist investor campaign), sports (a disputed referee call, a doping accusation, a bitter contract/transfer dispute, a coaching controversy), entertainment/culture, science or technology (a contested study, an ethics debate over new tech), law, or politics/security (a policy debate, a contested decision, a controversial use of force, a disputed ruling) — treat all of these as equally eligible. Set it to false for a routine report with a clear, undisputed outcome and no real controversy, regardless of topic (e.g. an arrest with no dispute about what happened, a traffic accident, someone hospitalized, a routine business earnings report, a final sports score nobody is contesting, a routine indictment) — these don't have two honest sides to represent, and forcing one produces a fake, manufactured disagreement.
- For each cluster where "has_genuine_dispute" is true, set "dispute_intensity" to a number 1-5 rating how significant and substantive the disagreement actually is: 1 is a minor procedural or technical disagreement few people care about, 5 is a major clash of values or policy with broad public significance. For clusters where "has_genuine_dispute" is false, set "dispute_intensity" to 0.
- ${CATEGORY_GUIDANCE}
- Return ONLY valid JSON, no other text

Return this exact JSON structure:
{
  "clusters": [
    {
      "topic_name": "string",
      "category": "${CATEGORY_ENUM}",
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
    .map((a) => `${a.source_name} (${a.source_lean}): ${a.title} — ${truncateDescription(a.description)}`)
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

  // Every field below renders on the same story page, so an LLM asked for
  // the same underlying facts nine different ways will default to
  // rephrasing the same 2-3 core facts repeatedly (observed directly: users
  // reported summary/what_happened/timeline/perspective-claims all reading
  // as restatements of each other — see Decision Log). The fix is giving
  // each field an explicit, distinct job and saying outright that
  // duplicating another field's content is a defect, not just describing
  // each field's length/tone in isolation the way this prompt used to.
  const noRepeatInstruction = `IMPORTANT — these fields all appear together on the same story page. Each one must add NEW information not already stated in another field. Do not rephrase one field as another field in different words. Specifically:
- "summary" is ONLY the stakes: why this matters, what it changes, who it affects. Do not restate the mechanical facts here — assume the reader will also read "what_happened" and needs "summary" to tell them something that section won't.
- "what_happened" is ONLY the mechanical facts (who did what, when, where) — no stakes, no "why it matters" framing. That belongs exclusively to "summary". If you can't write "what_happened" without repeating a sentence from "summary", you've put the wrong content in one of them.
- "what_happened_timeline" entries must each anchor a genuinely distinct point in time or step in a sequence — not a restatement of "what_happened" broken into bullets. If the source material only supports one or two real time-distinct events, return only that many; return an empty array rather than padding with a rephrased fact. Each entry also needs an honest "confidence" rating (see schema below) — do not default every entry to the same value if the sources actually differ in how firmly they report each fact.
- "perspective_a"/"perspective_b" are each side's narrative reasoning — why they see it that way.
- "perspective_a_claims"/"perspective_b_claims" are specific, concrete assertions that side makes — distinct from and more granular than the perspective's own summary sentence, not that summary split into 3 pieces.
- "key_differences_cause"/"key_differences_impact" describe WHY the two sides diverge (the mechanism of disagreement), not a restatement of either side's position.`;

  // A bias audit (2026-07-31) found that even when both perspectives got
  // equal length/claim counts, one side's claims were routinely stated as
  // settled fact while the other's were hedged/attributed to unnamed
  // "critics" — a blinded neutrality judge flagged this in 7 of 8 sampled
  // stories. An earlier, abstract version of this instruction ("state both
  // sides with equal confidence") was tested and made no measurable
  // difference — re-tested at 7/7 flagged afterward. This version is
  // deliberately mechanical instead of abstract: a fixed attribution frame
  // applied identically to both sides removes the room for the model to
  // drift back into confident-fact-vs-hedged-opinion phrasing, rather than
  // just asking it not to. Needs its own instruction rather than being
  // covered by nameNeutrality (governs how each side is NAMED) or
  // noRepeatInstruction (governs cross-field duplication).
  const epistemicParity =
    LOCALE === "he"
      ? `Every claim in "perspective_a_claims" and "perspective_b_claims" — and every sentence in "perspective_a"/"perspective_b" — must open with an explicit attribution naming that perspective, using the SAME grammatical frame for both sides (e.g. "[שם הפרספקטיבה] טוען/טוענת ש..." or "לפי [שם הפרספקטיבה], ..." — pick the verb form that correctly agrees in gender/number with that perspective's own name, but apply the identical attribution pattern to both sides equally). This is a mechanical rule, not a matter of tone: never phrase one side's claim as a bare unattributed fact ("X קרה") while phrasing the other's as a hedged, attributed opinion ("מבקרים טוענים ש-X אולי קרה") — both sides get the same attribution frame, stated with the same directness, so neither reads as objective truth and the other as contested speculation.`
      : `Every claim in "perspective_a_claims" and "perspective_b_claims" — and every sentence in "perspective_a"/"perspective_b" — must open with an explicit attribution naming that perspective, using the SAME grammatical frame for both sides (e.g. "[Perspective name] argues/holds/states that..."). This is a mechanical rule, not a matter of tone: never phrase one side's claim as a bare unattributed fact ("The strike hit only military targets") while phrasing the other's as a hedged, attributed opinion ("Critics argue the strike may have caused harm") — both sides get the same attribution frame, stated with the same directness, so neither reads as objective truth and the other as contested speculation.`;

  return `You are a news editor for FullScope, a news platform that shows every story from multiple perspectives. Based on the following articles about ${topicName}, generate a complete story entry.

Articles provided:
${list}

${perspectiveInstructions}

${noRepeatInstruction}

${epistemicParity}

${CATEGORY_GUIDANCE}

Return ONLY valid JSON with this exact structure:
{
  "title": "Engaging, objective headline under 15 words, no question mark at end",
  "summary": "2 sentence neutral statement of why this matters and what it affects — no mechanical facts, those belong in what_happened",
  "category": "${CATEGORY_ENUM}",
  "entities": {
    "people": ["real full names of individuals actually central to this story — not everyone mentioned in passing; empty array is correct if none qualify"],
    "companies": ["named organizations/companies/institutions central to this story; empty array is correct if none qualify"],
    "countries": ["countries central to this story; empty array is correct if none qualify"]
  },
  "perspective_a_name": "string",
  "perspective_a": "3-4 sentence summary of this perspective's take on the story",
  "perspective_a_claims": ["claim 1", "claim 2", "claim 3"],
  "perspective_b_name": "string",
  "perspective_b": "3-4 sentence summary of this perspective's take on the story",
  "perspective_b_claims": ["claim 1", "claim 2", "claim 3"],
  "what_happened": "3-4 sentence neutral factual summary with no opinion and no stakes/why-it-matters framing",
  "what_happened_timeline": [{"text": "concrete, time-distinct event", "confidence": "confirmed | reported | disputed | unknown — confirmed: multiple independent sources agree; reported: stated by named sources without independent confirmation; disputed: sources conflict; unknown: single unverified source"}],
  "key_differences_cause": "One sentence explaining why people disagree on the cause",
  "key_differences_impact": "One sentence explaining why people disagree on the impact",
  "sources": "comma separated list of source names used",
  "image_keywords": "2-5 word phrase in ENGLISH (regardless of what language the rest of this response is in) describing a concrete, photographable visual scene for this story — e.g. 'soldier military funeral', 'wildfire forest smoke', 'stock market trading floor'. This is used to search a stock photo library, which only understands English, so it must always be English even when everything else is Hebrew.",
  "location_name": "the single most specific real-world place this story is genuinely centered on — a city, town, region, or named landmark (e.g. 'Khan Younis', 'the Knesset', 'Ashkelon'). Empty string if the story isn't tied to one specific place — a story about national policy, an election, or a court ruling with no single physical location does NOT qualify just because a country was mentioned. This is used to link out to a map, so only fill it in when a reader would genuinely want to see where this happened."
}${LOCALE === "he" ? HEBREW_OUTPUT_INSTRUCTION : ""}`;
}

/** Only called when at least one Wikipedia entity match came back (see
 * fetchEntityContext) — most stories never reach this, so most generations
 * cost nothing extra. Deliberately conservative: the instruction is to
 * change nothing unless a reader would genuinely be missing something,
 * not to pad "what_happened" with trivia just because background exists. */
function buildBackgroundRevisionPrompt(whatHappened: string, context: EntitySummary[]): string {
  const contextList = context.map((c) => `${c.entity}: ${c.extract}`).join("\n\n");

  return `You are refining the "what happened" section of a news story. Below is the current text, followed by background information from Wikipedia about entities mentioned in the story.

Current text:
"${whatHappened}"

Wikipedia background on entities mentioned:
${contextList}

Task: weave in a fact from the background ONLY if a reader would genuinely be missing something necessary to understand the story without it — for example, clarifying who an unfamiliar organization or person is, or essential factual context a general reader wouldn't already have. Do not add background just because it's available; in most cases no change is needed at all. If you do add something, keep it brief (a clause or short sentence, not a paragraph), strictly factual and neutral — never editorialize, speculate, or add opinion. This must still read as the same story, not a Wikipedia summary.

If no change is needed, return the text exactly as given, unchanged.

Return ONLY valid JSON with this exact structure:
{
  "what_happened": "the revised (or unchanged) text"
}${LOCALE === "he" ? HEBREW_OUTPUT_INSTRUCTION : ""}`;
}

/** A bias audit (2026-07-31) found perspective_a was the establishment/
 * government/security-aligned side in 28 of 38 sampled Hebrew-mode stories
 * (74%, vs. an unbiased ~50%) — Claude has its own tendency to list
 * whichever stance it treats as the "primary" one first, and asking it to
 * consciously randomize its own output isn't reliable. The UI also renders
 * perspective_a first/more prominently (see Perspectives component), so
 * this isn't just a data-label quirk. Fixing it mechanically after
 * generation — a coin flip that swaps the two perspectives' fields — is
 * robust regardless of whatever pattern Claude's underlying generation
 * follows, and needs no prompt engineering. English mode is untouched: its
 * prompt fixes perspective_a to left/progressive and perspective_b to
 * right/conservative on purpose, so swapping there would break that
 * intentional convention. */
function randomizePerspectiveSlots(story: StoryGenerationResponse): StoryGenerationResponse {
  if (LOCALE !== "he") return story;
  if (Math.random() >= 0.5) return story;

  return {
    ...story,
    perspective_a_name: story.perspective_b_name,
    perspective_a: story.perspective_b,
    perspective_a_claims: story.perspective_b_claims,
    perspective_b_name: story.perspective_a_name,
    perspective_b: story.perspective_a,
    perspective_b_claims: story.perspective_a_claims,
  };
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

Below are the existing FullScope stories most similar to this new coverage (some may be archived — no longer on the main feed, but still real stories):
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

/** How many candidate stories the similarity search returns for the
 * related-story judgment call — same order of magnitude as the old
 * recency-window's 15 (10 live + 5 archived), kept small so
 * buildRelatedStoryPrompt's prompt stays cheap. */
const RELATED_STORY_CANDIDATE_COUNT = 8;

const RELATED_STORY_CANDIDATE_FIELDS = "id, slug, title, summary, archived_at, timeline, sources, published_at";

/** Original candidate source, kept as a fallback for when the embedding
 * call or the similarity RPC fails — scoped to the same category and capped
 * at 15 (10 live + 5 archived, live prioritized as more likely relevant).
 * This was the ONLY candidate source before embeddings were added
 * (2026-08-13); see 0025_story_embeddings.sql for why it was replaced as
 * the primary path — blind to continuations older than this window, and to
 * any story whose category drifted between the original and new coverage. */
async function findRelatedStoryCandidatesByRecency(
  supabase: SupabaseAdmin,
  category: string,
): Promise<RelatedStoryCandidate[]> {
  const { data: live } = await supabase
    .from("stories")
    .select(RELATED_STORY_CANDIDATE_FIELDS)
    .eq("category", category)
    .is("archived_at", null)
    .order("generated_at", { ascending: false })
    .limit(10);

  const { data: archived } = await supabase
    .from("stories")
    .select(RELATED_STORY_CANDIDATE_FIELDS)
    .eq("category", category)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false })
    .limit(5);

  return [...(live ?? []), ...(archived ?? [])] as unknown as RelatedStoryCandidate[];
}

/** Primary candidate source: embeds the new cluster's topic + article
 * titles as a search query, then a pgvector cosine-similarity search
 * (match_stories, see 0025_story_embeddings.sql) across ALL live + archived
 * stories — deliberately no category filter, since similarity is a better
 * narrowing signal than category ever was. Falls back to the old
 * recency-windowed, category-scoped query on any failure (missing/invalid
 * API key, network error, RPC error) — this check is a best-effort
 * optimization, never something that should block story generation over an
 * external embedding API hiccup. */
async function findRelatedStoryCandidates(
  supabase: SupabaseAdmin,
  category: string,
  clusterTopic: string,
  clusterArticles: RawArticleRow[],
): Promise<RelatedStoryCandidate[]> {
  try {
    const queryText = `${clusterTopic}\n${clusterArticles.map((a) => a.title).join("\n")}`;
    const embedding = await embedQuery(queryText);
    const { data, error } = await supabase.rpc("match_stories", {
      query_embedding: toPgVectorLiteral(embedding),
      match_count: RELATED_STORY_CANDIDATE_COUNT,
    });
    if (error) throw error;
    if (Array.isArray(data) && data.length > 0) {
      return data as unknown as RelatedStoryCandidate[];
    }
  } catch (err) {
    console.error(
      `Embedding-based related-story search failed for "${clusterTopic}", falling back to recency query:`,
      describeError(err),
    );
  }

  return findRelatedStoryCandidatesByRecency(supabase, category);
}

/** Checks whether a new cluster is really a development of an existing story
 * (live or archived) rather than a distinct new one. Returns null — meaning
 * "treat as new" — whenever there's nothing to compare against or the check
 * itself fails; this is a best-effort optimization, never something that
 * should block story generation. */
async function findRelatedStory(
  supabase: SupabaseAdmin,
  category: string,
  clusterTopic: string,
  clusterArticles: RawArticleRow[],
): Promise<{ candidate: RelatedStoryCandidate; newDevelopment: string } | null> {
  const candidates = await findRelatedStoryCandidates(supabase, category, clusterTopic, clusterArticles);
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

  // Shared across the concurrent map below — since these run concurrently,
  // two backfills in the same batch could both pass the duplicate check
  // before either adds its pick, so this only reliably avoids collisions
  // with already-live stories, not with each other. Acceptable for a
  // best-effort backfill path.
  const usedImageUrls = await fetchUsedImageUrls(supabase);

  const results = await Promise.all(
    rows.map(async (row) => {
      const keywords = await deriveImageKeywords(row.title, row.summary);
      const imageUrl = await findStoryImage(keywords ?? row.title, row.category, usedImageUrls);
      if (!imageUrl) return false;
      usedImageUrls.add(imageUrl);

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

/** One-time backfill for stories generated before embeddings existed
 * (2026-08-13) — everything generated after that point already gets
 * embedded inline at insert time (see the main generation loop below).
 * Archived stories are never pruned (see enforceStoryCap), so this set
 * turned out to be much larger in practice than the live-story count alone
 * suggests (297 in production, not ~60) — embedding one row per Voyage API
 * call blew through the free tier's 3-requests-per-minute limit almost
 * immediately (291 of 297 failed on the first real run). Uses the batched
 * embedTexts (up to 128 per call) instead, turning this into 1-3 Voyage
 * calls total regardless of story count. DB writes stay per-row (Postgres
 * has no equivalent rate limit to worry about here). */
async function backfillMissingEmbeddings(supabase: SupabaseAdmin): Promise<number> {
  const { data: rows, error } = await supabase
    .from("stories")
    .select("id, title, summary")
    .is("embedding", null);

  if (error) {
    console.error("Error fetching stories missing embeddings:", error.message);
    return 0;
  }
  if (!rows || rows.length === 0) return 0;

  let vectors: number[][];
  try {
    vectors = await embedTexts(rows.map((row) => `${row.title}\n\n${row.summary}`));
  } catch (err) {
    console.error("Error batch-embedding stories during backfill:", describeError(err));
    return 0;
  }

  let backfilled = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const { error: updateError } = await supabase
      .from("stories")
      .update({ embedding: toPgVectorLiteral(vectors[i]) })
      .eq("id", row.id);

    if (updateError) {
      console.error(`Error saving backfilled embedding for "${row.title}":`, updateError.message);
      continue;
    }
    backfilled += 1;
  }

  if (backfilled > 0) console.log(`Backfilled embeddings for ${backfilled} existing stories`);
  return backfilled;
}

/** Standalone entry point for the one-time embedding backfill — run once
 * after 0025_story_embeddings.sql is applied and VOYAGE_API_KEY is set. */
export async function backfillEmbeddingsOnly(): Promise<number> {
  const supabase = createProcessingClient();
  return backfillMissingEmbeddings(supabase);
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

/** Fetches unprocessed articles per source (capped at
 * MAX_ARTICLES_PER_SOURCE_PER_PASS each) rather than one global query, so a
 * handful of high-volume sources can't crowd out the rest of the active
 * list — see the constant's own comment for the production evidence that
 * motivated this. Runs one small query per source in parallel; a single
 * source's query failing is logged and treated as "no articles from that
 * source this run" rather than failing the whole fetch. */
async function fetchUnprocessedArticles(supabase: SupabaseAdmin): Promise<RawArticleRow[]> {
  const bySource = await Promise.all(
    ACTIVE_SOURCE_NAMES.map(async (sourceName) => {
      const { data, error } = await supabase
        .from("raw_articles")
        .select("id, source_name, source_lean, title, description, published_at")
        .eq("processed", false)
        .eq("source_name", sourceName)
        .order("published_at", { ascending: false })
        .limit(MAX_ARTICLES_PER_SOURCE_PER_PASS);

      if (error) {
        console.error(`Error fetching unprocessed articles for "${sourceName}":`, error.message);
        return [];
      }
      return (data ?? []) as RawArticleRow[];
    }),
  );
  return bySource.flat();
}

/** Image URLs already assigned to other live stories, so a new pick can
 * avoid handing two different stories the same photo. */
async function fetchUsedImageUrls(supabase: SupabaseAdmin): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("stories")
    .select("image_url")
    .is("archived_at", null)
    .not("image_url", "is", null);

  if (error) {
    console.error("Error fetching used image URLs:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.image_url).filter((url): url is string => Boolean(url)));
}

async function runProcessArticles(): Promise<ProcessArticlesResult> {
  const supabase = createProcessingClient();

  let processedCount = 0;
  let newStoryCount = 0;
  const addedStories: { title: string; category: string }[] = [];
  const updatedStories: { title: string; note: string }[] = [];
  const removedStories: { title: string }[] = [];

  const usedImageUrls = await fetchUsedImageUrls(supabase);
  const unprocessed = await fetchUnprocessedArticles(supabase);

  {
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

          // 4000 (raised from 3000 on 2026-07-31): a second line of defense
          // against response truncation, not the primary fix — the primary
          // fix is capping input description length above
          // (MAX_DESCRIPTION_CHARS_IN_PROMPT), same "bound input AND output,
          // don't just raise the ceiling" lesson as the clustering
          // truncation incident. The two defensive fallbacks below exist so
          // that IF truncation ever happens anyway, it degrades instead of
          // crashing and losing the whole cluster.
          const storyRaw = await callClaude(buildStoryPrompt(cluster.topic_name, clusterArticles), 4000);
          const story = randomizePerspectiveSlots(parseClaudeJson<StoryGenerationResponse>(storyRaw));

          const mostRecentPublishedAt = clusterArticles
            .map((a) => a.published_at)
            .filter((d): d is string => Boolean(d))
            .sort()
            .at(-1);

          // Fallback computed directly from the cluster's own known articles
          // rather than only trusting Claude to echo sources back — this is
          // exactly the field a 2026-07-31 truncation incident dropped
          // (it's last in the JSON schema, so a cut-off response loses it
          // first).
          const fallbackSources = [...new Set(clusterArticles.map((a) => a.source_name))].join(", ");
          const storySources = story.sources || fallbackSources;

          const imageUrl = await findStoryImage(story.image_keywords || story.title, story.category, usedImageUrls);
          if (imageUrl) usedImageUrls.add(imageUrl);

          // Best-effort background context (see wikipedia.ts): only touches
          // what_happened, and only when a Wikipedia match actually came
          // back — most stories never reach the revision call at all, so
          // this costs nothing extra for them. Any failure here just keeps
          // the original text; it should never lose or block the story.
          let finalWhatHappened = story.what_happened;
          try {
            const entityContext = await fetchEntityContext(
              story.entities ?? { people: [], companies: [], countries: [] },
            );
            if (entityContext.length > 0) {
              const revisionRaw = await callClaude(
                buildBackgroundRevisionPrompt(story.what_happened, entityContext),
                600,
              );
              const revision = parseClaudeJson<{ what_happened: string }>(revisionRaw);
              if (revision.what_happened) finalWhatHappened = revision.what_happened;
            }
          } catch (err) {
            console.error(
              `Error adding Wikipedia background for "${story.title}":`,
              describeError(err),
            );
          }

          // Best-effort embedding for the related-story similarity search
          // (see findRelatedStoryCandidates / 0025_story_embeddings.sql).
          // Embedded from title + summary rather than what_happened — the
          // Wikipedia background revision above can change what_happened's
          // exact wording, and summary is otherwise the more stable field.
          // A failed embed leaves this story simply unmatchable by
          // similarity (findRelatedStoryCandidates falls back to the
          // recency query, and this story just won't surface there either)
          // — never something that should block story creation itself.
          let embedding: string | null = null;
          try {
            const vector = await embedText(`${story.title}\n\n${story.summary}`);
            embedding = toPgVectorLiteral(vector);
          } catch (err) {
            console.error(`Error embedding "${story.title}":`, describeError(err));
          }

          const storyRow = {
            slug: slugify(story.title),
            title: story.title,
            category: story.category,
            summary: story.summary,
            what_happened: finalWhatHappened,
            entities: story.entities ?? { people: [], companies: [], countries: [] },
            location_name: story.location_name || null,
            embedding,
            timeline: story.what_happened_timeline,
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
            sources: storySources
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
