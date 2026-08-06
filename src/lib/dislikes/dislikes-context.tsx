"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { toggleDislikeAction } from "./actions";

interface DislikesContextValue {
  dislikedSlugs: string[];
  isDisliked: (slug: string) => boolean;
  toggleDislike: (slug: string) => void;
  /** Local-only removal, no server call — for the Like button to call when
   * liking a story clears its dislike server-side (see toggleBookmarkAction),
   * so this context's client state stays in sync without a refetch. */
  removeDislikeLocally: (slug: string) => void;
  isReady: boolean;
}

const DislikesContext = createContext<DislikesContextValue | null>(null);

export function DislikesProvider({
  initialSlugs,
  children,
}: {
  initialSlugs: string[];
  children: React.ReactNode;
}) {
  const [dislikedSlugs, setDislikedSlugs] = useState<string[]>(initialSlugs);

  const toggleDislike = useCallback((slug: string) => {
    setDislikedSlugs((current) => {
      const wasDisliked = current.includes(slug);
      const next = wasDisliked ? current.filter((s) => s !== slug) : [...current, slug];

      toggleDislikeAction(slug).then((result) => {
        if ("error" in result) {
          setDislikedSlugs((c) =>
            wasDisliked ? (c.includes(slug) ? c : [...c, slug]) : c.filter((s) => s !== slug),
          );
        }
      });

      return next;
    });
  }, []);

  const removeDislikeLocally = useCallback((slug: string) => {
    setDislikedSlugs((current) => current.filter((s) => s !== slug));
  }, []);

  const isDisliked = useCallback((slug: string) => dislikedSlugs.includes(slug), [dislikedSlugs]);

  const value = useMemo(
    () => ({ dislikedSlugs, isDisliked, toggleDislike, removeDislikeLocally, isReady: true }),
    [dislikedSlugs, isDisliked, toggleDislike, removeDislikeLocally],
  );

  return <DislikesContext.Provider value={value}>{children}</DislikesContext.Provider>;
}

export function useDislikes() {
  const ctx = useContext(DislikesContext);
  if (!ctx) {
    throw new Error("useDislikes must be used within a DislikesProvider");
  }
  return ctx;
}
