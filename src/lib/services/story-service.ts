import type { Category, StorySummary, StoryWithPosts } from "@/types/domain";
import { getAllStories, getStoryBySlug } from "@/lib/repositories/story-repository";

export { getStoryBySlug };

export function toSummary(story: StoryWithPosts): StorySummary {
  return {
    id: story.id,
    slug: story.slug,
    title: story.title,
    category: story.category,
    summary: story.summary,
    publishedAt: story.publishedAt,
    readingTimeMinutes: story.readingTimeMinutes,
    postCount: story.posts.length,
  };
}

/** Newest-first list of every story, as lightweight summaries for cards. */
export async function listStorySummaries(): Promise<StorySummary[]> {
  const stories = await getAllStories();
  return stories
    .map(toSummary)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
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

/**
 * Free-text match across title, summary, category, and the full story body
 * (what happened + both perspectives). The seed data doesn't tag individual
 * stories with structured person/company/country fields, so matching the
 * full text is how a search for e.g. "Iran" or "Live Nation" still works.
 * Exported (not just used internally) so the client-side Search page can
 * run the identical match against data it already has in memory.
 */
export function matchesQuery(story: StoryWithPosts, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return false;

  const haystack = [
    story.title,
    story.summary,
    story.category,
    story.whatHappened,
    story.perspectiveA.name,
    story.perspectiveA.summary,
    story.perspectiveB.name,
    story.perspectiveB.summary,
    ...story.sources.map((s) => s.publisher),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(trimmed);
}

export async function searchStories(query: string): Promise<StorySummary[]> {
  const stories = await getAllStories();
  return stories
    .filter((story) => matchesQuery(story, query))
    .map(toSummary)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
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
