"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { togglePostBookmarkAction } from "./actions";

interface PostBookmarksContextValue {
  bookmarkedPostIds: string[];
  isPostBookmarked: (postId: string) => boolean;
  togglePostBookmark: (postId: string) => void;
  isReady: boolean;
}

const PostBookmarksContext = createContext<PostBookmarksContextValue | null>(null);

export function PostBookmarksProvider({
  initialPostIds,
  children,
}: {
  initialPostIds: string[];
  children: React.ReactNode;
}) {
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState<string[]>(initialPostIds);

  const togglePostBookmark = useCallback((postId: string) => {
    setBookmarkedPostIds((current) => {
      const wasBookmarked = current.includes(postId);
      const next = wasBookmarked ? current.filter((id) => id !== postId) : [...current, postId];

      togglePostBookmarkAction(postId).then((result) => {
        if ("error" in result) {
          setBookmarkedPostIds((c) =>
            wasBookmarked ? (c.includes(postId) ? c : [...c, postId]) : c.filter((id) => id !== postId),
          );
        }
      });

      return next;
    });
  }, []);

  const isPostBookmarked = useCallback(
    (postId: string) => bookmarkedPostIds.includes(postId),
    [bookmarkedPostIds],
  );

  const value = useMemo(
    () => ({ bookmarkedPostIds, isPostBookmarked, togglePostBookmark, isReady: true }),
    [bookmarkedPostIds, isPostBookmarked, togglePostBookmark],
  );

  return (
    <PostBookmarksContext.Provider value={value}>{children}</PostBookmarksContext.Provider>
  );
}

export function usePostBookmarks() {
  const ctx = useContext(PostBookmarksContext);
  if (!ctx) {
    throw new Error("usePostBookmarks must be used within a PostBookmarksProvider");
  }
  return ctx;
}
