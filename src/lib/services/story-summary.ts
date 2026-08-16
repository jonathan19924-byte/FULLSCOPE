import type { StorySummary, StoryWithPosts } from "@/types/domain";
// Type-only import — erased at compile time, so this doesn't pull the
// server-only repository module into client bundles (search-page-client.tsx
// imports toSummary/matchesQuery from this file specifically to avoid that).
import type { StorySummaryRow } from "@/lib/repositories/story-repository";

const TRENDING_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Israel time, not UTC — the pipeline's cron schedule is UTC, but "today"
 * should mean today for the app's actual (Israeli) readers, not whatever
 * day it happens to be at the server's clock. */
const DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jerusalem",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function isSameCalendarDay(isoDate: string, compareToMs: number): boolean {
  return DAY_FORMATTER.format(new Date(isoDate)) === DAY_FORMATTER.format(new Date(compareToMs));
}

/**
 * Pure, repository-free functions — kept separate from story-service.ts
 * because that file imports the repository (now server-only, since it reads
 * Supabase via src/lib/supabase/server.ts), and search-page-client.tsx needs
 * these two functions from a Client Component.
 */

export function toSummary(story: StorySummaryRow): StorySummary {
  return {
    id: story.id,
    slug: story.slug,
    title: story.title,
    category: story.category,
    summary: story.summary,
    publishedAt: story.publishedAt,
    readingTimeMinutes: story.readingTimeMinutes,
    imageUrl: story.imageUrl,
    archivedAt: story.archivedAt,
    postCount: story.posts.length,
    recentPostCount: story.posts.filter(
      (p) => Date.now() - new Date(p.createdAt).getTime() <= TRENDING_WINDOW_MS,
    ).length,
    perspectiveA: {
      name: story.perspectiveA.name,
      postCount: story.posts.filter((p) => p.perspective === "A").length,
    },
    perspectiveB: {
      name: story.perspectiveB.name,
      postCount: story.posts.filter((p) => p.perspective === "B").length,
    },
    addedToday: story.generatedAt ? isSameCalendarDay(story.generatedAt, Date.now()) : false,
    // Overridden by listStorySummaries with the real value from
    // getRecentStoryUpdateTypes — this is just the base default for any
    // caller of toSummary() that doesn't merge that in (e.g. a single
    // story fetched via getStoryBySlug).
    isDeveloping: false,
  };
}

/**
 * Free-text match across title, summary, category, and the full story body
 * (what happened + both perspectives). The seed data doesn't tag individual
 * stories with structured person/company/country fields, so matching the
 * full text is how a search for e.g. "Iran" or "Live Nation" still works.
 * Exported so the client-side Search page can run the identical match
 * against data it already has in memory.
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
