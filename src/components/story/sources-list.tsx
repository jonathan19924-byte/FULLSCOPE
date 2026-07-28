import { Newspaper } from "lucide-react";
import type { Source } from "@/types/domain";
import { t } from "@/lib/i18n";

export function SourcesList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;

  return (
    <section aria-labelledby="sources-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="sources-heading" className="font-serif text-lg font-semibold text-foreground">
          {t.story.sources}
        </h2>
        <p className="text-xs text-muted-foreground">{t.story.sourcesDisclaimer}</p>
      </div>
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
    </section>
  );
}
