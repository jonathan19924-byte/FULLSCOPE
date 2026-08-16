import type {
  Category,
  SeedPostWithStory,
  StorySummary,
  StoryWithPosts,
} from "@/types/domain";
import {
  getAllStories,
  getAllStorySummaries,
  getArchivedStorySummaries,
  getRecentStoryUpdateTypes,
  getStandaloneSeedPosts,
  getStoryBySlug,
} from "@/lib/repositories/story-repository";
import { matchesQuery, toSummary } from "./story-summary";

export { getStoryBySlug, getStandaloneSeedPosts, matchesQuery, toSummary };

/** Newest-first list of every story, as lightweight summaries for cards. */
export async function listStorySummaries(): Promise<StorySummary[]> {
  const [stories, recentUpdates] = await Promise.all([
    getAllStorySummaries(),
    getRecentStoryUpdateTypes(),
  ]);
  return stories
    .map(toSummary)
    .map((summary) => {
      const recent = recentUpdates.get(summary.id);
      return { ...summary, recentUpdateType: recent?.type, isDeveloping: recent?.isDeveloping ?? false };
    })
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

/** Stories removed from the main feed (cap eviction or dedup merge), newest
 * archived first — for the Home page's History tab. */
export async function listArchivedStorySummaries(): Promise<StorySummary[]> {
  const stories = await getArchivedStorySummaries();
  return stories.map(toSummary);
}

/** The single most recent story, used for the Home page's featured slot.
 * Takes an already-fetched summary list (rather than fetching its own) so
 * callers that need multiple derived views of the same request — like the
 * Home page, which also needs the full list and a category-filtered list —
 * only pay for one round-trip to Supabase instead of one per view. */
export function getFeaturedStory(summaries: StorySummary[]): StorySummary | undefined {
  return summaries[0];
}

export function getStoriesByCategory(
  summaries: StorySummary[],
  category: Category | "All",
): StorySummary[] {
  if (category === "All") return summaries;
  return summaries.filter((s) => s.category === category);
}

export async function searchStories(query: string): Promise<StorySummary[]> {
  const stories = await getAllStories();
  return stories
    .filter((story) => matchesQuery(story, query))
    .map(toSummary)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

/** Every seeded post across every story, newest-first, for the Posts feed. */
export async function getAllSeedPosts(): Promise<SeedPostWithStory[]> {
  const stories = await getAllStorySummaries();
  return stories
    .flatMap((story) =>
      story.posts.map((post) => ({
        ...post,
        storySlug: story.slug,
        storyTitle: story.title,
        storyCategory: story.category,
      })),
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** Up to 3 other stories in the same category, for the Story Page footer. */
export function getRelatedStories(
  summaries: StorySummary[],
  story: StoryWithPosts,
  limit = 3,
): StorySummary[] {
  return summaries
    .filter((s) => s.category === story.category && s.slug !== story.slug)
    .slice(0, limit);
}
