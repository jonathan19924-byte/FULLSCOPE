/**
 * Data access layer. Combines the local seed stories with real
 * Claude-generated stories from Supabase (written by scripts/fetch-rss.ts +
 * scripts/process-articles.ts) — merged, not replaced, so the curated demo
 * set stays reliable even as the live pipeline's output varies day to day.
 * Everything above this file only ever speaks in the `Story`/`StoryWithPosts`
 * domain types, so this is the only file a data-source change touches.
 */
import type {
  Category,
  Entities,
  Fact,
  Perspective,
  Post,
  Source,
  StandaloneSeedPost,
  StoryWithPosts,
} from "@/types/domain";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import seedStories from "@/lib/data/seed-stories.json";
import seedStandalonePosts from "@/lib/data/seed-standalone-posts.json";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { LOCALE } from "@/lib/locale";

/** The static seed set is English-only demo content — only relevant while
 * running in English mode. In Hebrew mode it would otherwise sit permanently
 * mixed into every listing, search, and category filter alongside real
 * generated Hebrew stories. Gated (not deleted) so switching back to English
 * later restores it automatically. */
const stories = LOCALE === "en" ? (seedStories as unknown as StoryWithPosts[]) : [];
const standalonePosts = LOCALE === "en" ? (seedStandalonePosts as unknown as StandaloneSeedPost[]) : [];

interface GeneratedStoryRow {
  id: string;
  slug: string;
  title: string;
  category: Category;
  summary: string;
  what_happened: string;
  timeline: unknown;
  perspective_a: unknown;
  perspective_b: unknown;
  key_differences_cause: string;
  key_differences_impact: string;
  sources: unknown;
  entities: unknown;
  location_name: string | null;
  published_at: string;
  reading_time_minutes: number;
  image_url: string | null;
  archived_at: string | null;
  generated_at: string | null;
}

interface GeneratedPostRow {
  id: string;
  story_id: string;
  display_name: string;
  perspective: string;
  content: string;
  is_generated: boolean;
  like_count: number;
  reply_count: number;
  created_at: string;
}

/**
 * `generateStaticParams` (build time, no request) and the odd static-render
 * attempt Next makes before bailing to dynamic both surface as a
 * "Dynamic server usage ... cookies" error from the Supabase client — that's
 * Next's own expected signal to re-render this route dynamically, not a
 * real failure, so it's not worth logging as one. Anything else genuinely
 * is a problem and gets logged.
 */
function logStoryFetchError(label: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("Dynamic server usage")) return;
  console.error(`${label}:`, message);
}

function mapPostRow(row: GeneratedPostRow): Post {
  return {
    id: row.id,
    storyId: row.story_id,
    displayName: row.display_name,
    perspective: row.perspective === "B" ? "B" : "A",
    content: row.content,
    isGenerated: row.is_generated,
    likeCount: row.like_count,
    replyCount: row.reply_count,
    createdAt: row.created_at,
  };
}

function mapStoryRow(row: GeneratedStoryRow, postRows: GeneratedPostRow[]): StoryWithPosts {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    whatHappened: row.what_happened,
    timeline: row.timeline as Fact[],
    perspectiveA: row.perspective_a as Perspective,
    perspectiveB: row.perspective_b as Perspective,
    keyDifferencesCause: row.key_differences_cause,
    keyDifferencesImpact: row.key_differences_impact,
    sources: row.sources as Source[],
    entities: row.entities as Entities,
    locationName: row.location_name ?? undefined,
    publishedAt: row.published_at,
    readingTimeMinutes: row.reading_time_minutes,
    imageUrl: row.image_url ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    generatedAt: row.generated_at ?? undefined,
    posts: postRows.map(mapPostRow),
  };
}

/** Everything a story-card list view actually renders — a small slice of
 * the full Story shape, deliberately excluding the heavy fields (timeline,
 * full perspective summaries/claims, sources, entities, whatHappened) that
 * only the individual Story page needs. Structurally compatible with
 * StoryWithPosts, so seed stories (already fully-shaped in memory) satisfy
 * this type for free with no conversion. */
export type StorySummaryRow = Pick<
  StoryWithPosts,
  | "id"
  | "slug"
  | "title"
  | "category"
  | "summary"
  | "publishedAt"
  | "readingTimeMinutes"
  | "imageUrl"
  | "archivedAt"
  | "generatedAt"
  | "posts"
> & {
  // Only the name, not the full PerspectiveTally (postCount) — toSummary()
  // computes postCount itself from `posts`, and the light select never
  // fetches enough to know it upfront. Narrower than Perspective too (skips
  // summary/claims), which keeps StoryWithPosts structurally assignable
  // here for free — searchStories/getRelatedStories pass full stories
  // straight into toSummary without any conversion.
  perspectiveA: { name: string };
  perspectiveB: { name: string };
};

interface GeneratedStorySummaryRow {
  id: string;
  slug: string;
  title: string;
  category: Category;
  summary: string;
  published_at: string;
  reading_time_minutes: number;
  image_url: string | null;
  archived_at: string | null;
  generated_at: string | null;
  perspective_a_name: string | null;
  perspective_b_name: string | null;
}

function mapStoryRowLight(
  row: GeneratedStorySummaryRow,
  postRows: GeneratedPostRow[],
): StorySummaryRow {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    summary: row.summary,
    publishedAt: row.published_at,
    readingTimeMinutes: row.reading_time_minutes,
    imageUrl: row.image_url ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    generatedAt: row.generated_at ?? undefined,
    posts: postRows.map(mapPostRow),
    perspectiveA: { name: row.perspective_a_name ?? "" },
    perspectiveB: { name: row.perspective_b_name ?? "" },
  };
}

const STORY_SUMMARY_COLUMNS =
  "id, slug, title, category, summary, published_at, reading_time_minutes, image_url, archived_at, generated_at, " +
  "perspective_a_name:perspective_a->>name, perspective_b_name:perspective_b->>name";

/** Light-column version of getGeneratedStories, for list views (Home, Posts
 * feed) that only ever render a StorySummary. Skips every heavy JSONB field
 * that isn't shown on a card — the actual fix for multi-second list-page
 * loads once the stories table grew past a couple hundred rows. Cached for
 * 60s (story content only changes when the pipeline runs a few times a
 * day) via a cookie-free client, since unstable_cache forbids request-scoped
 * dynamic APIs in the cached function body. */
const getGeneratedStorySummaries = unstable_cache(
  async (archivedOnly: boolean): Promise<StorySummaryRow[]> => {
    try {
      const supabase = createPublicClient();
      // Explicit result-type param: the JSONB-path aliases in
      // STORY_SUMMARY_COLUMNS (perspective_a->>name) are too dynamic for
      // supabase-js to statically infer against the Database type, which
      // would otherwise degrade `data`/`error` to an unusable placeholder type.
      let query = supabase
        .from("stories")
        .select<string, GeneratedStorySummaryRow>(STORY_SUMMARY_COLUMNS);
      query = archivedOnly
        ? query.not("archived_at", "is", null).order("archived_at", { ascending: false })
        : query.is("archived_at", null).order("published_at", { ascending: false });
      const { data: storyRows, error: storiesError } = await query;

      if (storiesError) {
        logStoryFetchError("Error fetching generated story summaries", storiesError.message);
        return [];
      }
      if (!storyRows || storyRows.length === 0) return [];

      const storyIds = storyRows.map((row) => row.id);
      const { data: postRows, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .in("story_id", storyIds);

      if (postsError) {
        logStoryFetchError("Error fetching posts for story summaries", postsError.message);
      }

      const postsByStoryId = new Map<string, GeneratedPostRow[]>();
      for (const row of (postRows ?? []) as unknown as GeneratedPostRow[]) {
        const list = postsByStoryId.get(row.story_id) ?? [];
        list.push(row);
        postsByStoryId.set(row.story_id, list);
      }

      return storyRows.map((row) =>
        mapStoryRowLight(row, postsByStoryId.get(row.id) ?? []),
      );
    } catch (err) {
      logStoryFetchError("Error loading generated story summaries from Supabase", err);
      return [];
    }
  },
  ["generated-story-summaries"],
  { revalidate: 60 },
);

/** Every story as a lightweight summary — the light-select equivalent of
 * getAllStories(), for Home/Posts/any list view. */
export async function getAllStorySummaries(): Promise<StorySummaryRow[]> {
  const generated = await getGeneratedStorySummaries(false);
  return [...generated, ...stories];
}

/** Light-select equivalent of getArchivedStories(), for the History tab. */
export async function getArchivedStorySummaries(): Promise<StorySummaryRow[]> {
  return getGeneratedStorySummaries(true);
}

/** Real stories generated by the pipeline, full shape (every field,
 * including the heavy JSONB columns) — only needed by Search, which does a
 * free-text match across the full story body, and by the individual Story
 * page's related-stories lookup path. Never throws — a Supabase hiccup
 * degrades to an empty list (seed stories still show) rather than crashing
 * every page that reads through this repository. Cached for 60s via a
 * cookie-free client, same reasoning as getGeneratedStorySummaries above. */
const getGeneratedStories = unstable_cache(
  async (): Promise<StoryWithPosts[]> => {
    try {
      const supabase = createPublicClient();
      const { data: storyRows, error: storiesError } = await supabase
        .from("stories")
        .select("*")
        .is("archived_at", null)
        .order("published_at", { ascending: false });

      if (storiesError) {
        logStoryFetchError("Error fetching generated stories", storiesError.message);
        return [];
      }
      if (!storyRows || storyRows.length === 0) return [];

      const storyIds = storyRows.map((row) => row.id);
      const { data: postRows, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .in("story_id", storyIds);

      if (postsError) {
        logStoryFetchError("Error fetching generated posts", postsError.message);
      }

      const postsByStoryId = new Map<string, GeneratedPostRow[]>();
      for (const row of (postRows ?? []) as unknown as GeneratedPostRow[]) {
        const list = postsByStoryId.get(row.story_id) ?? [];
        list.push(row);
        postsByStoryId.set(row.story_id, list);
      }

      return (storyRows as unknown as GeneratedStoryRow[]).map((row) =>
        mapStoryRow(row, postsByStoryId.get(row.id) ?? []),
      );
    } catch (err) {
      logStoryFetchError("Error loading generated stories from Supabase", err);
      return [];
    }
  },
  ["generated-stories-full"],
  { revalidate: 60 },
);

/** Full-shape story list — only Search needs this; every other list view
 * should use getAllStorySummaries() instead. */
export async function getAllStories(): Promise<StoryWithPosts[]> {
  const generated = await getGeneratedStories();
  return [...generated, ...stories];
}

/** How long a story keeps showing the "Updated" marker after a reader-trend
 * or new-coverage update — long enough to be seen across a normal browsing
 * session, short enough that the marker doesn't just become permanent
 * background noise. */
const RECENT_UPDATE_WINDOW_HOURS = 48;

/** Tighter window for the stronger "Developing" signal — distinct from
 * "Updated" (which just means "touched at some point in the last two days")
 * because a reader trying to follow something actively unfolding needs to
 * know it's still moving right now, not that it moved at some point
 * yesterday. Both badges read off the same story_updates rows/query — this
 * is purely a second, stricter cutoff on data already being fetched. */
const DEVELOPING_WINDOW_HOURS = 6;

export interface RecentStoryUpdate {
  type: "trend" | "coverage";
  /** True when the most recent qualifying update landed within
   * DEVELOPING_WINDOW_HOURS, not just RECENT_UPDATE_WINDOW_HOURS. */
  isDeveloping: boolean;
}

/** Maps storyId -> its most recent qualifying update, for stories updated
 * within the window above. Deliberately excludes "merge" (dedup
 * consolidating a duplicate) — that's bookkeeping, not new context added to
 * the story the way a reader trend or fresh coverage is. */
export async function getRecentStoryUpdateTypes(): Promise<Map<string, RecentStoryUpdate>> {
  try {
    const supabase = await createClient();
    const since = new Date(Date.now() - RECENT_UPDATE_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
    const developingSince = Date.now() - DEVELOPING_WINDOW_HOURS * 60 * 60 * 1000;
    const { data, error } = await supabase
      .from("story_updates")
      .select("story_id, update_type, created_at")
      .in("update_type", ["trend", "coverage"])
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (error) {
      logStoryFetchError("Error fetching recent story updates", error.message);
      return new Map();
    }

    const map = new Map<string, RecentStoryUpdate>();
    for (const row of (data ?? []) as {
      story_id: string;
      update_type: "trend" | "coverage";
      created_at: string;
    }[]) {
      if (!map.has(row.story_id)) {
        map.set(row.story_id, {
          type: row.update_type,
          isDeveloping: new Date(row.created_at).getTime() >= developingSince,
        });
      }
    }
    return map;
  } catch (err) {
    logStoryFetchError("Error loading recent story updates from Supabase", err);
    return new Map();
  }
}

/** The actual Supabase fetch, keyed by an already-normalized slug —
 * wrapped in React's cache() so generateMetadata and the page component
 * (two independent Next.js entry points for the same request, with no way
 * to pass a value between them directly) share one real query instead of
 * each running their own. Must be called with the normalized slug, not the
 * raw route param — cache() keys on the literal argument, and the two
 * callers have been observed to pass differently-encoded forms of the same
 * slug (see getStoryBySlug below), which would otherwise defeat the cache. */
const fetchGeneratedStoryBySlug = cache(async (slug: string): Promise<StoryWithPosts | undefined> => {
  try {
    const supabase = await createClient();
    const { data: storyRow, error: storyError } = await supabase
      .from("stories")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (storyError || !storyRow) return undefined;

    const { data: postRows, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .eq("story_id", storyRow.id);

    if (postsError) {
      logStoryFetchError("Error fetching posts for generated story", postsError.message);
    }

    return mapStoryRow(
      storyRow as unknown as GeneratedStoryRow,
      (postRows ?? []) as unknown as GeneratedPostRow[],
    );
  } catch (err) {
    logStoryFetchError("Error loading generated story from Supabase", err);
    return undefined;
  }
});

export async function getStoryBySlug(
  rawSlug: string,
): Promise<StoryWithPosts | undefined> {
  // The dynamic route's `params.slug` sometimes arrives still
  // percent-encoded (observed to differ between generateMetadata and the
  // page component for the same request, for non-ASCII slugs — a Next.js
  // 16 quirk). decodeURIComponent is a safe no-op on an already-decoded
  // string, so normalizing here covers both cases.
  let slug = rawSlug;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    // Malformed percent-encoding — fall back to the raw value.
  }

  const seedMatch = stories.find((story) => story.slug === slug);
  if (seedMatch) return seedMatch;

  return fetchGeneratedStoryBySlug(slug);
}

/** Seeded posts with no related story — only shown on the general Posts feed. */
export async function getStandaloneSeedPosts(): Promise<StandaloneSeedPost[]> {
  return standalonePosts;
}

