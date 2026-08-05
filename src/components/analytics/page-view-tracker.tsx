"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Fires a fire-and-forget log of every route change to /api/track-view,
 * for the separate FullScope_Dashboard analytics tool to read. Silently
 * no-ops on failure — visit tracking should never be able to break the app. */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
