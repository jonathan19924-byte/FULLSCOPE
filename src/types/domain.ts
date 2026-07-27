/**
 * Domain types for FullScope. These describe the shape of a Story independent
 * of where it comes from (seed data today, RSS/LLM ingestion later) — every
 * repository and service in this app speaks in these types.
 */

export type Category = "Politics" | "World" | "Technology" | "Science";

export const CATEGORIES: Category[] = [
  "Politics",
  "World",
  "Technology",
  "Science",
];

export type Confidence = "confirmed" | "reported" | "disputed" | "unknown";

export interface Fact {
  text: string;
  confidence: Confidence;
}

export interface Source {
  publisher: string;
  title?: string;
  url?: string;
  publishedAt?: string;
  sourceType?: string;
}

export interface Entities {
  people: string[];
  companies: string[];
  countries: string[];
}

export interface Perspective {
  name: string;
  summary: string;
  claims: string[];
}

export interface Post {
  id: string;
  storyId: string;
  displayName: string;
  perspective: "A" | "B";
  content: string;
  isGenerated: boolean;
  likeCount: number;
  replyCount: number;
  createdAt: string;
}

export interface Story {
  id: string;
  slug: string;
  title: string;
  category: Category;
  summary: string;
  whatHappened: string;
  timeline: Fact[];
  perspectiveA: Perspective;
  perspectiveB: Perspective;
  keyDifferencesCause: string;
  keyDifferencesImpact: string;
  sources: Source[];
  entities: Entities;
  publishedAt: string;
  readingTimeMinutes: number;
  imageUrl?: string;
}

export interface StoryWithPosts extends Story {
  posts: Post[];
}

export interface PerspectiveTally {
  name: string;
  postCount: number;
}

export interface StorySummary
  extends Pick<
    Story,
    | "id"
    | "slug"
    | "title"
    | "category"
    | "summary"
    | "publishedAt"
    | "readingTimeMinutes"
    | "imageUrl"
  > {
  postCount: number;
  perspectiveA: PerspectiveTally;
  perspectiveB: PerspectiveTally;
}

/** A seeded story reaction, flattened with the story it belongs to — used on the Posts feed. */
export interface SeedPostWithStory extends Post {
  storySlug: string;
  storyTitle: string;
  storyCategory: Category;
}

/** A seeded post with no related story — appears only on the general Posts feed. */
export interface StandaloneSeedPost {
  id: string;
  displayName: string;
  content: string;
  isGenerated: boolean;
  likeCount: number;
  replyCount: number;
  createdAt: string;
}

/**
 * A post a reader creates (Create tab). Stored server-side, tied to the
 * signed-in account that created it, and visible to everyone alongside the
 * seeded posts.
 */
export interface CommunityPost {
  id: string;
  userId: string;
  displayName: string;
  content: string;
  createdAt: string;
  relatedStorySlug?: string;
  relatedStoryTitle?: string;
  relatedStoryCategory?: Category;
  /** Set when this post was part of a reader trend (3+ distinct users
   * making the same point) that got folded into the story — see
   * src/lib/articles/trend-detection.ts. The theme text, for display. */
  contributionTheme?: string;
}
