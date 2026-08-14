"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { toggleBlockAction } from "./actions";

interface BlocksContextValue {
  blockedIds: string[];
  isBlocked: (userId: string) => boolean;
  toggleBlock: (userId: string) => void;
}

const BlocksContext = createContext<BlocksContextValue | null>(null);

/** Mirrors FollowsProvider exactly — a small client-held array of ids,
 * optimistically updated and rolled back on server error. */
export function BlocksProvider({
  initialBlockedIds,
  children,
}: {
  initialBlockedIds: string[];
  children: React.ReactNode;
}) {
  const [blockedIds, setBlockedIds] = useState<string[]>(initialBlockedIds);

  const toggleBlock = useCallback((userId: string) => {
    setBlockedIds((current) => {
      const wasBlocked = current.includes(userId);
      const next = wasBlocked ? current.filter((id) => id !== userId) : [...current, userId];

      toggleBlockAction(userId).then((result) => {
        if ("error" in result) {
          setBlockedIds((c) =>
            wasBlocked ? (c.includes(userId) ? c : [...c, userId]) : c.filter((id) => id !== userId),
          );
        }
      });

      return next;
    });
  }, []);

  const isBlocked = useCallback((userId: string) => blockedIds.includes(userId), [blockedIds]);

  const value = useMemo(
    () => ({ blockedIds, isBlocked, toggleBlock }),
    [blockedIds, isBlocked, toggleBlock],
  );

  return <BlocksContext.Provider value={value}>{children}</BlocksContext.Provider>;
}

export function useBlocks() {
  const ctx = useContext(BlocksContext);
  if (!ctx) {
    throw new Error("useBlocks must be used within a BlocksProvider");
  }
  return ctx;
}
