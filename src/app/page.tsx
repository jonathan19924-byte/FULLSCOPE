import Link from "next/link";
import { BadgeCheck, Clock, Newspaper, Scale, Search } from "lucide-react";
import { CATEGORIES, type Category } from "@/types/domain";
import {
  getFeaturedStory,
  getStoriesByCategory,
  listArchivedStorySummaries,
  listStorySummaries,
} from "@/lib/services/story-service";
import { CategoryFilter } from "@/components/story/category-filter";
import { FeedTabs } from "@/components/story/feed-tabs";
import { StoryCard } from "@/components/story/story-card";
import { MostDiscussed } from "@/components/story/most-discussed";
import { EmptyState } from "@/components/shared/empty-state";
import { t } from "@/lib/i18n";
import { Archive } from "lucide-react";

function parseCategory(raw: string | string[] | undefined): Category | "All" {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (CATEGORIES as string[]).includes(value ?? "") ? (value as Category) : "All";
}

// Kept in English per explicit request — an exception to the rest of the
// Hebrew UI translation, specific to this row.
const VALUE_PROPS = [
  { icon: BadgeCheck, label: "Named sources" },
  { icon: Clock, label: "Timelines" },
  { icon: Scale, label: "Two perspectives" },
  { icon: Newspaper, label: "Sources" },
] as const;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; view?: string }>;
}) {
  const params = await searchParams;
  const category = parseCategory(params.category);
  const view = params.view === "history" ? "history" : "feed";

  const allStories = await listStorySummaries();
  const stories = view === "feed" ? await getStoriesByCategory(category) : [];
  const featured = view === "feed" && category === "All" ? await getFeaturedStory() : undefined;
  const latest = featured ? stories.filter((s) => s.slug !== featured.slug) : stories;
  const archivedStories = view === "history" ? await listArchivedStorySummaries() : [];

  const counts = {
    All: allStories.length,
    Politics: allStories.filter((s) => s.category === "Politics").length,
    World: allStories.filter((s) => s.category === "World").length,
    Technology: allStories.filter((s) => s.category === "Technology").length,
    Science: allStories.filter((s) => s.category === "Science").length,
  } as Record<Category | "All", number>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-8 sm:pt-10">
      <div className="flex flex-col items-center gap-2 border-b border-border/60 pb-6 text-center">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
          FullScope
        </h1>
        <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
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
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-2 text-xs text-muted-foreground">
          {VALUE_PROPS.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <Icon className="size-3.5" strokeWidth={1.75} />
              {label}
            </span>
          ))}
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
            <div className="flex flex-col gap-6">
              {featured && (
                <section aria-label={t.home.featuredStoryAria}>
                  <StoryCard story={featured} variant="featured" />
                </section>
              )}

              {category === "All" && <MostDiscussed stories={allStories} />}

              <section aria-label={t.home.latestStoriesAria} className="flex flex-col gap-4">
                {latest.length > 0 && (
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {category === "All" ? t.home.latest : t.home.categoryStories(t.category[category])}
                  </h2>
                )}
                <div className="flex flex-col gap-4">
                  {latest.map((story) => (
                    <StoryCard key={story.id} story={story} variant="standard" />
                  ))}
                </div>
              </section>
            </div>
          )}
        </>
      ) : (
        <section aria-label={t.home.historyStoriesAria} className="flex flex-col gap-4">
          {archivedStories.length === 0 ? (
            <EmptyState
              icon={Archive}
              title={t.home.historyEmptyTitle}
              description={t.home.historyEmptyDescription}
            />
          ) : (
            <div className="flex flex-col gap-4">
              {archivedStories.map((story) => (
                <StoryCard key={story.id} story={story} variant="standard" />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
