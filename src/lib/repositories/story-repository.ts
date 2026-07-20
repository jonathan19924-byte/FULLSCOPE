/**
 * Data access layer. Today this reads the local seed data; a future version
 * can swap the bodies of these two functions for real API/database calls
 * without touching any page or component, since everything above this file
 * only ever speaks in the `Story` / `StoryWithPosts` domain types.
 */
import type { StoryWithPosts } from "@/types/domain";
import seedStories from "@/lib/data/seed-stories.json";

const stories = seedStories as unknown as StoryWithPosts[];

export async function getAllStories(): Promise<StoryWithPosts[]> {
  return stories;
}

export async function getStoryBySlug(
  slug: string,
): Promise<StoryWithPosts | undefined> {
  return stories.find((story) => story.slug === slug);
}
