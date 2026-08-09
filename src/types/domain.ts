/**
 * Domain types for FullScope. These describe the shape of a Story independent
 * of where it comes from (seed data today, RSS/LLM ingestion later) — every
 * repository and service in this app speaks in these types.
 */

/**
 * Expanded from 4 to 9 categories (2026-08-02) after reviewing all 158 real
 * live+archived stories: "Politics" and "World" had become overloaded
 * catch-alls hiding several genuinely distinct, recurring clusters (Iran/
 * Hezbollah/IDF security news, court rulings and defamation suits, routine
 * crime, Haredi-secular tension, business/market news miscategorized into
 * Technology) — see CONTENT_PIPELINE.md for the full breakdown. Existing
 * stories keep whatever category they already have; only new generations
 * use the finer taxonomy.
 */
export type Category =
  | "Politics"
  | "Security & Defense"
  | "Law & Courts"
  | "Crime & Safety"
  | "World"
  | "Business & Economy"
  | "Technology"
  | "Science"
  | "Society & Religion";

export const CATEGORIES: Category[] = [
  "Politics",
  "Security & Defense",
  "Law & Courts",
  "Crime & Safety",
  "World",
  "Business & Economy",
  "Technology",
  "Science",
  "Society & Religion",
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
  /** The single real-world place this story is centered on, if any — used
   * to show a "view on map" button. Undefined for the (common) case of a
   * story that isn't tied to one specific place. */
  locationName?: string;
  publishedAt: string;
  readingTimeMinutes: number;
  imageUrl?: string;
  /** Set when this story was removed from the main feed (cap eviction or
   * dedup merge) instead of deleted — shown in the History tab. Undefined
   * for a story that's currently live. */
  archivedAt?: string;
  /** When the pipeline actually created this row — distinct from
   * publishedAt, which is derived from the source articles' own dates and
   * can predate generation. Drives the "Added today" marker. Undefined for
   * the static seed set, which was never "generated" in this sense. */
  generatedAt?: string;
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
    | "archivedAt"
  > {
  postCount: number;
  /** Posts (generated + real reader posts) created in the last 24h — the
   * basis for the "Trending now" ranking, distinct from postCount (all-time
   * volume) so a story's trending rank fades as engagement cools rather
   * than staying pinned by an old burst of activity forever. */
  recentPostCount: number;
  perspectiveA: PerspectiveTally;
  perspectiveB: PerspectiveTally;
  /** Set when the story got a reader-trend or new-coverage update within the
   * last 48h — drives the "Updated" marker on story cards. Undefined for a
   * story with no recent qualifying update. */
  recentUpdateType?: "trend" | "coverage";
  /** True when the story was generated on the same calendar day (Israel
   * time) as now — drives the "Added today" marker. Always false for the
   * static seed set. */
  addedToday: boolean;
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
  /** The author's @handle (profiles.username), for linking to their public
   * profile — undefined if they haven't claimed a username yet, in which
   * case the post shows a name but isn't a clickable profile link. */
  username?: string;
  content: string;
  createdAt: string;
  relatedStorySlug?: string;
  relatedStoryTitle?: string;
  relatedStoryCategory?: Category;
  /** Set when this post was part of a reader trend (3+ distinct users
   * making the same point) that got folded into the story — see
   * src/lib/articles/trend-detection.ts. The theme text, for display. */
  contributionTheme?: string;
  likeCount: number;
  /** Whether the CURRENTLY SIGNED-IN reader has liked this post — undefined
   * when viewing signed out (there's no "my like" to speak of). */
  likedByMe?: boolean;
  /** A publicly-readable URL for the photo attached to this post, present
   * only once the photo has passed the vision moderation check run at
   * creation time — a pending or rejected photo never populates this. */
  mediaUrl?: string;
  /** Real comment count (community_post_comments), not-hidden only. Fetched
   * on demand per-post (see getPostComments) rather than bundled in here —
   * this is just the count for the feed's badge. */
  commentCount: number;
}

/** A single comment on a community post. Fetched on demand when a post's
 * dialog opens, not bundled into the main feed payload. */
export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  displayName: string;
  username?: string;
  content: string;
  createdAt: string;
}

/** A user's public identity — the subset of `profiles` anyone can see,
 * distinct from their private settings. Added alongside the follow feature,
 * since following someone requires being able to see who they are. */
export interface PublicProfile {
  userId: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  followerCount: number;
  followingCount: number;
}

export type NotificationType = "post_liked" | "post_commented" | "new_follower" | "post_credited";

/** An in-app notification for the signed-in reader. `actorUserId`/
 * `actorDisplayName` are undefined for system-generated events
 * (post_credited comes from the trend-detection cron, not one specific
 * user). `relatedPostId` links to a community post, `relatedStorySlug` to a
 * story — a given type populates whichever one is relevant. */
export interface Notification {
  id: string;
  type: NotificationType;
  actorUserId?: string;
  actorDisplayName?: string;
  actorUsername?: string;
  relatedPostId?: string;
  relatedStorySlug?: string;
  relatedStoryTitle?: string;
  createdAt: string;
  readAt?: string;
}
