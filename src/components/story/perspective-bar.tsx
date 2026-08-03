import { MessageSquare } from "lucide-react";
import type { PerspectiveTally } from "@/types/domain";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

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
      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        <div
          style={{ width: `${aPercent}%` }}
          className="border-e-2 border-background bg-perspective-a"
        />
        <div style={{ width: `${bPercent}%` }} className="bg-perspective-b" />
      </div>
      <div className="flex flex-col gap-1 text-xs font-medium">
        <span className="flex items-center gap-1.5 text-foreground">
          <span className="size-2 shrink-0 rounded-full bg-perspective-a" aria-hidden />
          <span className="truncate">{perspectiveA.name}</span>
        </span>
        <span className="flex items-center gap-1.5 text-foreground">
          <span className="size-2 shrink-0 rounded-full bg-perspective-b" aria-hidden />
          <span className="truncate">{perspectiveB.name}</span>
        </span>
      </div>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <MessageSquare className="size-3.5" strokeWidth={1.75} />
        {t.story.readerPosts(total)}
      </span>
    </div>
  );
}
