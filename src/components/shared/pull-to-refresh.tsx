"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const PULL_THRESHOLD = 64;
const MAX_PULL = 96;

/**
 * Wraps page content with a touch-driven pull-to-refresh gesture. The whole
 * page is the scroll container here (no inner overflow div), so "at the
 * top" means window.scrollY === 0, not a ref's own scrollTop. Uses
 * useTransition around router.refresh() specifically because refresh()
 * itself returns void — isPending is the only reliable signal for when the
 * re-fetched Server Component data has actually landed.
 */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pullDistance, setPullDistance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || isPending) return;
      startYRef.current = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (startYRef.current === null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0 || window.scrollY > 0) {
        startYRef.current = null;
        setPullDistance(0);
        return;
      }
      e.preventDefault();
      setPullDistance(Math.min(delta * 0.5, MAX_PULL));
    }

    function onTouchEnd() {
      if (startYRef.current === null) return;
      startYRef.current = null;
      setPullDistance((current) => {
        if (current >= PULL_THRESHOLD) {
          startTransition(() => router.refresh());
        }
        return 0;
      });
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [isPending, router]);

  const showIndicator = pullDistance > 0 || isPending;

  return (
    <div ref={containerRef}>
      {showIndicator && (
        <div
          className="flex items-center justify-center overflow-hidden transition-[height] duration-150 ease-out"
          style={{ height: isPending ? 44 : pullDistance }}
        >
          <RefreshCw
            className={cn("size-5 text-muted-foreground", isPending && "animate-spin")}
            strokeWidth={1.75}
            style={
              isPending
                ? undefined
                : { transform: `rotate(${Math.min((pullDistance / PULL_THRESHOLD) * 360, 360)}deg)` }
            }
          />
        </div>
      )}
      {children}
    </div>
  );
}
