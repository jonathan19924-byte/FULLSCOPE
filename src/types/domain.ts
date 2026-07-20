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
}

export interface StoryWithPosts extends Story {
  posts: Post[];
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
  > {
  postCount: number;
}
