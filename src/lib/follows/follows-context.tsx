"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { toggleFollowAction } from "./actions";

interface FollowsContextValue {
  followingIds: string[];
  isFollowing: (userId: string) => boolean;
  toggleFollow: (userId: string) => void;
  isReady: boolean;
}

const FollowsContext = createContext<FollowsContextValue | null>(null);

/** Mirrors BookmarksProvider exactly — a small client-held array of ids,
 * optimistically updated and rolled back on server error. */
export function FollowsProvider({
  initialFollowingIds,
  children,
}: {
  initialFollowingIds: string[];
  children: React.ReactNode;
}) {
  const [followingIds, setFollowingIds] = useState<string[]>(initialFollowingIds);

  const toggleFollow = useCallback((userId: string) => {
    setFollowingIds((current) => {
      const wasFollowing = current.includes(userId);
      const next = wasFollowing ? current.filter((id) => id !== userId) : [...current, userId];

      toggleFollowAction(userId).then((result) => {
        if ("error" in result) {
          setFollowingIds((c) =>
            wasFollowing ? (c.includes(userId) ? c : [...c, userId]) : c.filter((id) => id !== userId),
          );
        }
      });

      return next;
    });
  }, []);

  const isFollowing = useCallback((userId: string) => followingIds.includes(userId), [followingIds]);

  const value = useMemo(
    () => ({ followingIds, isFollowing, toggleFollow, isReady: true }),
    [followingIds, isFollowing, toggleFollow],
  );

  return <FollowsContext.Provider value={value}>{children}</FollowsContext.Provider>;
}

export function useFollows() {
  const ctx = useContext(FollowsContext);
  if (!ctx) {
    throw new Error("useFollows must be used within a FollowsProvider");
  }
  return ctx;
}
