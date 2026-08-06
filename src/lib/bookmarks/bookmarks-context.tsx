"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { toggleBookmarkAction } from "./actions";

interface BookmarksContextValue {
  bookmarkedSlugs: string[];
  isBookmarked: (slug: string) => boolean;
  toggleBookmark: (slug: string) => void;
  /** Local-only removal, no server call — for the Dislike button to call
   * when disliking a story clears its like server-side (see
   * toggleDislikeAction), so this context's client state stays in sync
   * without a refetch. */
  removeBookmarkLocally: (slug: string) => void;
  isReady: boolean;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

export function BookmarksProvider({
  initialSlugs,
  children,
}: {
  initialSlugs: string[];
  children: React.ReactNode;
}) {
  const [bookmarkedSlugs, setBookmarkedSlugs] = useState<string[]>(initialSlugs);

  const toggleBookmark = useCallback((slug: string) => {
    setBookmarkedSlugs((current) => {
      const wasBookmarked = current.includes(slug);
      const next = wasBookmarked ? current.filter((s) => s !== slug) : [...current, slug];

      toggleBookmarkAction(slug).then((result) => {
        if ("error" in result) {
          setBookmarkedSlugs((c) =>
            wasBookmarked ? (c.includes(slug) ? c : [...c, slug]) : c.filter((s) => s !== slug),
          );
        }
      });

      return next;
    });
  }, []);

  const removeBookmarkLocally = useCallback((slug: string) => {
    setBookmarkedSlugs((current) => current.filter((s) => s !== slug));
  }, []);

  const isBookmarked = useCallback(
    (slug: string) => bookmarkedSlugs.includes(slug),
    [bookmarkedSlugs],
  );

  const value = useMemo(
    () => ({ bookmarkedSlugs, isBookmarked, toggleBookmark, removeBookmarkLocally, isReady: true }),
    [bookmarkedSlugs, isBookmarked, toggleBookmark, removeBookmarkLocally],
  );

  return (
    <BookmarksContext.Provider value={value}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  const ctx = useContext(BookmarksContext);
  if (!ctx) {
    throw new Error("useBookmarks must be used within a BookmarksProvider");
  }
  return ctx;
}
