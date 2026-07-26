import { MessageSquare } from "lucide-react";
import type { PerspectiveTally } from "@/types/domain";
import { cn } from "@/lib/utils";

interface PerspectiveBarProps {
  perspectiveA: PerspectiveTally;
  perspectiveB: PerspectiveTally;
  className?: string;
}

const MIN_SEGMENT_PERCENT = 22;

export function PerspectiveBar({ perspectiveA, perspectiveB, className }: PerspectiveBarProps) {
  const total = perspectiveA.postCount + perspectiveB.postCount;
  if (total === 0) return null;

  const rawAPercent = (perspectiveA.postCount / total) * 100;
  const aPercent = Math.min(
    100 - MIN_SEGMENT_PERCENT,
    Math.max(MIN_SEGMENT_PERCENT, rawAPercent),
  );
  const bPercent = 100 - aPercent;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex h-9 w-full overflow-hidden rounded-full text-xs font-medium text-white">
        <div
          style={{ width: `${aPercent}%` }}
          className="flex items-center justify-start truncate bg-perspective-a px-2.5"
        >
          <span className="truncate">{perspectiveA.name}</span>
        </div>
        <div
          style={{ width: `${bPercent}%` }}
          className="flex items-center justify-start truncate bg-perspective-b px-2.5"
        >
          <span className="truncate">{perspectiveB.name}</span>
        </div>
      </div>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <MessageSquare className="size-3.5" strokeWidth={1.75} />
        {total} reader {total === 1 ? "post" : "posts"}
      </span>
    </div>
  );
}
