import type {
  Category,
  SeedPostWithStory,
  StorySummary,
  StoryWithPosts,
} from "@/types/domain";
import {
  getAllStories,
  getArchivedStories,
  getRecentStoryUpdateTypes,
  getStandaloneSeedPosts,
  getStoryBySlug,
} from "@/lib/repositories/story-repository";
import { matchesQuery, toSummary } from "./story-summary";

export { getStoryBySlug, getStandaloneSeedPosts, matchesQuery, toSummary };

/** Newest-first list of every story, as lightweight summaries for cards. */
export async function listStorySummaries(): Promise<StorySummary[]> {
  const [stories, recentUpdates] = await Promise.all([getAllStories(), getRecentStoryUpdateTypes()]);
  return stories
    .map(toSummary)
    .map((summary) => ({ ...summary, recentUpdateType: recentUpdates.get(summary.id) }))
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

/** Stories removed from the main feed (cap eviction or dedup merge), newest
 * archived first — for the Home page's History tab. */
export async function listArchivedStorySummaries(): Promise<StorySummary[]> {
  const stories = await getArchivedStories();
  return stories.map(toSummary);
}

/** The single most recent story, used for the Home page's featured slot. */
export async function getFeaturedStory(): Promise<StorySummary | undefined> {
  const summaries = await listStorySummaries();
  return summaries[0];
}

/** All stories except the featured one, newest first. */
export async function getLatestStories(
  excludeSlug?: string,
): Promise<StorySummary[]> {
  const summaries = await listStorySummaries();
  return excludeSlug
    ? summaries.filter((s) => s.slug !== excludeSlug)
    : summaries;
}

export async function getStoriesByCategory(
  category: Category | "All",
): Promise<StorySummary[]> {
  const summaries = await listStorySummaries();
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
  const stories = await getAllStories();
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
export async function getRelatedStories(
  story: StoryWithPosts,
  limit = 3,
): Promise<StorySummary[]> {
  const summaries = await listStorySummaries();
  return summaries
    .filter((s) => s.category === story.category && s.slug !== story.slug)
    .slice(0, limit);
}
