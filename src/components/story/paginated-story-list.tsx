"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { StorySummary } from "@/types/domain";
import { StoryCard } from "@/components/story/story-card";
import { t } from "@/lib/i18n";

const PAGE_SIZE = 10;

/** Renders stories as compact rows, loaded 10 at a time behind a "Show
 * more" button — same expand pattern as SourcesList/Timeline — instead of
 * the flat full-card list this replaces, which had no cap and rendered
 * every story at once regardless of list length. */
export function PaginatedStoryList({ stories }: { stories: StorySummary[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = stories.slice(0, visibleCount);
  const remaining = stories.length - visibleCount;

  return (
    <div className="flex flex-col gap-2">
      {visible.map((story) => (
        <StoryCard key={story.id} story={story} variant="compact" />
      ))}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
          className="flex w-fit items-center gap-1.5 self-center rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          {t.home.showMoreStories(Math.min(PAGE_SIZE, remaining))}
          <ChevronDown className="size-3.5" strokeWidth={1.75} />
        </button>
      )}
    </div>
  );
}
