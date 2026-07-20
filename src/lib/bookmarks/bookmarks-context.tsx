"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "fullscope:bookmarks";

function readStoredSlugs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

interface BookmarksContextValue {
  bookmarkedSlugs: string[];
  isBookmarked: (slug: string) => boolean;
  toggleBookmark: (slug: string) => void;
  /** False until the browser's saved bookmarks have loaded, to avoid a flash of "not bookmarked". */
  isReady: boolean;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const [bookmarkedSlugs, setBookmarkedSlugs] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setBookmarkedSlugs(readStoredSlugs());
    setIsReady(true);

    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) {
        setBookmarkedSlugs(readStoredSlugs());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggleBookmark = useCallback((slug: string) => {
    setBookmarkedSlugs((current) => {
      const next = current.includes(slug)
        ? current.filter((s) => s !== slug)
        : [...current, slug];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (slug: string) => bookmarkedSlugs.includes(slug),
    [bookmarkedSlugs],
  );

  const value = useMemo(
    () => ({ bookmarkedSlugs, isBookmarked, toggleBookmark, isReady }),
    [bookmarkedSlugs, isBookmarked, toggleBookmark, isReady],
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
