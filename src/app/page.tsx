import Link from "next/link";
import { Search } from "lucide-react";
import { CATEGORIES, type Category } from "@/types/domain";
import { getFeaturedStory, getStoriesByCategory } from "@/lib/services/story-service";
import { CategoryFilter } from "@/components/story/category-filter";
import { StoryCard } from "@/components/story/story-card";
import { EmptyState } from "@/components/shared/empty-state";

function parseCategory(raw: string | string[] | undefined): Category | "All" {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (CATEGORIES as string[]).includes(value ?? "") ? (value as Category) : "All";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const category = parseCategory(params.category);

  const stories = await getStoriesByCategory(category);
  const featured = category === "All" ? await getFeaturedStory() : undefined;
  const latest = featured ? stories.filter((s) => s.slug !== featured.slug) : stories;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-8 sm:pt-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          FullScope
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Understand the story, not just the headline — verified facts, a
          timeline, and both sides in one place.
        </p>
      </div>

      <Link
        href="/search"
        className="flex h-12 items-center gap-2.5 rounded-full border border-border bg-muted/50 px-4 text-sm text-muted-foreground transition-colors hover:border-foreground/30"
      >
        <Search className="size-4.5" strokeWidth={1.75} />
        Search stories, people, places…
      </Link>

      <CategoryFilter selected={category} />

      {stories.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No stories in this category yet"
          description="Try a different category, or view all stories."
          action={
            <Link
              href="/"
              className="text-sm font-medium text-foreground underline underline-offset-4"
            >
              View all stories
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {featured && (
            <section aria-label="Featured story">
              <StoryCard story={featured} variant="featured" />
            </section>
          )}

          <section aria-label="Latest stories" className="flex flex-col gap-4">
            {latest.length > 0 && (
              <h2 className="text-sm font-medium text-muted-foreground">
                {category === "All" ? "Latest" : `${category} stories`}
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
    </div>
  );
}
