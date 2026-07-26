"use client";

import { useMemo, useState } from "react";
import { Search as SearchIcon, X } from "lucide-react";
import type { StoryWithPosts } from "@/types/domain";
import { matchesQuery, toSummary } from "@/lib/services/story-summary";
import { StoryCard } from "@/components/story/story-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export function SearchPageClient({ stories }: { stories: StoryWithPosts[] }) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();

  const results = useMemo(() => {
    if (!trimmed) return [];
    return stories.filter((s) => matchesQuery(s, trimmed)).map(toSummary);
  }, [stories, trimmed]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-6 pb-8">
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
        Search
      </h1>

      <div className="relative flex items-center">
        <SearchIcon
          className="pointer-events-none absolute left-4 size-4.5 text-muted-foreground"
          strokeWidth={1.75}
        />
        <input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, topic, person, place…"
          aria-label="Search stories"
          className="h-12 w-full rounded-full border border-border bg-muted/50 pl-11 pr-11 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-foreground/40"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear search"
            onClick={() => setQuery("")}
            className="absolute right-1.5 rounded-full"
          >
            <X className="size-4" strokeWidth={1.75} />
          </Button>
        )}
      </div>

      {!trimmed && (
        <EmptyState
          icon={SearchIcon}
          title="Search FullScope"
          description="Try a topic, a person's name, a country, a company, or a category like “Technology.”"
        />
      )}

      {trimmed && results.length === 0 && (
        <EmptyState
          icon={SearchIcon}
          title="No stories found"
          description={`Nothing matched "${trimmed}". Try a different word or check your spelling.`}
        />
      )}

      {results.length > 0 && (
        <div className="flex flex-col gap-4" aria-live="polite">
          <p className="text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? "result" : "results"}
          </p>
          {results.map((story) => (
            <StoryCard key={story.id} story={story} variant="standard" />
          ))}
        </div>
      )}
    </div>
  );
}
