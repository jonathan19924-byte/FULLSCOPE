import { Newspaper } from "lucide-react";
import type { Source } from "@/types/domain";

export function SourcesList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;

  return (
    <section aria-labelledby="sources-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="sources-heading" className="font-serif text-lg font-semibold text-foreground">
          Sources
        </h2>
        <p className="text-xs text-muted-foreground">
          Supporting references reported this story — not FullScope stories themselves.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {sources.map((source, i) => (
          <li
            key={i}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Newspaper className="size-4 text-muted-foreground" strokeWidth={1.75} />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-foreground">
                {source.publisher}
              </span>
              <span className="text-xs text-muted-foreground">
                {source.sourceType ?? "News"}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
