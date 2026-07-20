"use client";

import { useState } from "react";
import type { Fact } from "@/types/domain";
import { cn } from "@/lib/utils";

const COLLAPSE_LENGTH = 120;

function TimelineEntry({ fact, index }: { fact: Fact; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = fact.text.length > COLLAPSE_LENGTH;
  const displayText =
    isLong && !expanded ? `${fact.text.slice(0, COLLAPSE_LENGTH).trim()}…` : fact.text;

  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      <div className="flex flex-col items-center">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-foreground/15 bg-background text-xs font-medium text-foreground">
          {index + 1}
        </span>
        <span className="mt-1 w-px flex-1 bg-border/70 last:hidden" aria-hidden />
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm leading-relaxed text-foreground/90">{displayText}</p>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              "mt-1 text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground",
            )}
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>
    </li>
  );
}

export function Timeline({ facts }: { facts: Fact[] }) {
  if (facts.length === 0) return null;

  return (
    <section aria-labelledby="timeline-heading" className="flex flex-col gap-3">
      <h2 id="timeline-heading" className="font-serif text-lg font-semibold text-foreground">
        Timeline
      </h2>
      <ol className="flex flex-col">
        {facts.map((fact, i) => (
          <TimelineEntry key={i} fact={fact} index={i} />
        ))}
      </ol>
    </section>
  );
}
