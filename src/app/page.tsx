import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, type Category, type StorySummary } from "@/types/domain";
import {
  getFeaturedStory,
  getStoriesByCategory,
  listArchivedStorySummaries,
  listStorySummaries,
} from "@/lib/services/story-service";
import { CategoryFilter } from "@/components/story/category-filter";
import { FeedTabs } from "@/components/story/feed-tabs";
import { StoryCard } from "@/components/story/story-card";
import { PaginatedStoryList } from "@/components/story/paginated-story-list";
import { MostDiscussed } from "@/components/story/most-discussed";
import { BookmarksPageClient } from "@/components/bookmarks/bookmarks-page-client";
import { EmptyState } from "@/components/shared/empty-state";
import { PullToRefresh } from "@/components/shared/pull-to-refresh";
import { t } from "@/lib/i18n";
import { Archive } from "lucide-react";

function parseCategory(raw: string | string[] | undefined): Category | "All" {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (CATEGORIES as string[]).includes(value ?? "") ? (value as Category) : "All";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; view?: string }>;
}) {
  const params = await searchParams;
  const category = parseCategory(params.category);
  const view =
    params.view === "history" ? "history" : params.view === "bookmarks" ? "bookmarks" : "feed";

  const allStories = await listStorySummaries();
  const stories = view === "feed" ? getStoriesByCategory(allStories, category) : [];
  const featured = view === "feed" && category === "All" ? getFeaturedStory(allStories) : undefined;
  const latest = featured ? stories.filter((s) => s.slug !== featured.slug) : stories;
  const allArchivedStories = view === "history" ? await listArchivedStorySummaries() : [];
  const archivedStories = getStoriesByCategory(allArchivedStories, category);

  // Derived generically from CATEGORIES rather than one hardcoded line per
  // category — the old hand-enumerated version silently produced
  // `undefined` counts for any category not individually listed, which the
  // `as` cast let through undetected until the 5-category expansion would
  // have broken it at runtime.
  function countsFor(summaries: StorySummary[]): Record<Category | "All", number> {
    return {
      All: summaries.length,
      ...Object.fromEntries(
        CATEGORIES.map((cat) => [cat, summaries.filter((s) => s.category === cat).length]),
      ),
    } as Record<Category | "All", number>;
  }
  const counts = countsFor(allStories);
  const historyCounts = countsFor(allArchivedStories);

  return (
    <PullToRefresh>
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-8 sm:pt-10">
      <div className="flex flex-col items-center gap-2 border-b border-border/60 pb-4 text-center">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          FullScope
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          {t.brand.tagline}
        </p>
        {/* Kept in English per explicit request — an exception to the rest
         * of the Hebrew UI translation, specific to this row. */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-1 text-xs font-medium text-muted-foreground">
          <span>{allStories.length} stories</span>
          <span aria-hidden>·</span>
          <span>{CATEGORIES.length} categories</span>
          <span aria-hidden>·</span>
          <span>every story, both sides</span>
        </div>
      </div>

      <Link
        href="/search"
        className="flex h-12 items-center gap-2.5 rounded-full border border-border bg-muted/50 px-4 text-sm text-muted-foreground transition-colors hover:border-foreground/30"
      >
        <Search className="size-4.5" strokeWidth={1.75} />
        {t.home.searchPlaceholder}
      </Link>

      <FeedTabs active={view} />

      {view === "feed" ? (
        <>
          <CategoryFilter selected={category} counts={counts} />

          {stories.length === 0 ? (
            <EmptyState
              icon={Search}
              title={t.home.emptyTitle}
              description={t.home.emptyDescription}
              action={
                <Link
                  href="/"
                  className="text-sm font-medium text-foreground underline underline-offset-4"
                >
                  {t.home.viewAllStories}
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-8">
              {featured && (
                <section aria-label={t.home.featuredStoryAria}>
                  <StoryCard story={featured} variant="featured" />
                </section>
              )}

              {category === "All" && <MostDiscussed stories={allStories} />}

              <section
                aria-label={t.home.latestStoriesAria}
                className={cn(
                  "flex flex-col gap-4",
                  category === "All" && "border-t border-border/60 pt-6",
                )}
              >
                {latest.length > 0 && (
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {category === "All" ? t.home.latest : t.home.categoryStories(t.category[category])}
                  </h2>
                )}
                <PaginatedStoryList key={`feed-${category}`} stories={latest} />
              </section>
            </div>
          )}
        </>
      ) : view === "history" ? (
        <>
          <CategoryFilter selected={category} counts={historyCounts} view="history" />

          <section aria-label={t.home.historyStoriesAria} className="flex flex-col gap-4">
            {archivedStories.length === 0 ? (
              <EmptyState
                icon={Archive}
                title={t.home.historyEmptyTitle}
                description={t.home.historyEmptyDescription}
              />
            ) : (
              <PaginatedStoryList key={`history-${category}`} stories={archivedStories} />
            )}
          </section>
        </>
      ) : (
        <BookmarksPageClient stories={allStories} hideHeading />
      )}
    </div>
    </PullToRefresh>
  );
}
