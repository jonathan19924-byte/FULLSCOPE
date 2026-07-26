"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { toggleBookmarkAction } from "./actions";

interface BookmarksContextValue {
  bookmarkedSlugs: string[];
  isBookmarked: (slug: string) => boolean;
  toggleBookmark: (slug: string) => void;
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

  const isBookmarked = useCallback(
    (slug: string) => bookmarkedSlugs.includes(slug),
    [bookmarkedSlugs],
  );

  const value = useMemo(
    () => ({ bookmarkedSlugs, isBookmarked, toggleBookmark, isReady: true }),
    [bookmarkedSlugs, isBookmarked, toggleBookmark],
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
