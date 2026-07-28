"use client";

import { Bookmark } from "lucide-react";
import type { StorySummary } from "@/types/domain";
import { useBookmarks } from "@/lib/bookmarks/bookmarks-context";
import { StoryCard } from "@/components/story/story-card";
import { EmptyState } from "@/components/shared/empty-state";
import { t } from "@/lib/i18n";

interface BookmarksPageClientProps {
  stories: StorySummary[];
  /** Set when embedded in the Home page's Bookmarks tab, which already has
   * its own outer layout and tab context — skips the standalone page's
   * wrapper/heading so the two don't double up. */
  hideHeading?: boolean;
}

export function BookmarksPageClient({ stories, hideHeading }: BookmarksPageClientProps) {
  const { bookmarkedSlugs, isReady } = useBookmarks();
  const bookmarked = stories.filter((s) => bookmarkedSlugs.includes(s.slug));

  const content = !isReady ? null : bookmarked.length === 0 ? (
    <EmptyState
      icon={Bookmark}
      title={t.bookmarks.emptyTitle}
      description={t.bookmarks.emptyDescription}
    />
  ) : (
    <div className="flex flex-col gap-4">
      {bookmarked.map((story) => (
        <StoryCard key={story.id} story={story} variant="standard" />
      ))}
    </div>
  );

  if (hideHeading) return content;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-6 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {t.bookmarks.title}
        </h1>
        <p className="text-sm text-muted-foreground">{t.bookmarks.description}</p>
      </div>
      {content}
    </div>
  );
}
