"use client";

import { useState } from "react";
import { ChevronDown, Newspaper } from "lucide-react";
import type { Source } from "@/types/domain";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

export function SourcesList({ sources }: { sources: Source[] }) {
  const [expanded, setExpanded] = useState(false);

  if (sources.length === 0) return null;

  return (
    <section aria-labelledby="sources-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="sources-heading" className="font-serif text-lg font-semibold text-foreground">
          {t.story.sources}
        </h2>
        <p className="text-xs text-muted-foreground">{t.story.sourcesDisclaimer}</p>
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-fit items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
      >
        {expanded ? t.common.showLess : t.story.showSources(sources.length)}
        <ChevronDown
          className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
          strokeWidth={1.75}
        />
      </button>
      {expanded && (
        <ul className="flex flex-wrap gap-2">
          {sources.map((source, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-full border border-border/60 bg-card py-1.5 ps-2 pe-3"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                <Newspaper className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-medium text-foreground">{source.publisher}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
