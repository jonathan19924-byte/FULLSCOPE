"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Perspective } from "@/types/domain";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const TEASER_LENGTH = 140;

function PerspectiveCard({ label, perspective }: { label: string; perspective: Perspective }) {
  const [expanded, setExpanded] = useState(false);
  const teaser =
    perspective.summary.length > TEASER_LENGTH
      ? `${perspective.summary.slice(0, TEASER_LENGTH).trim()}…`
      : perspective.summary;

  return (
    <article className="flex flex-1 flex-col rounded-2xl border border-border/60 bg-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full flex-col gap-2 p-4 text-start"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-lg font-semibold text-foreground">
            <span className="sr-only">{label}: </span>
            {perspective.name}
          </h3>
          <ChevronDown
            className={cn(
              "mt-1 size-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
            strokeWidth={1.75}
          />
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">
          {expanded ? perspective.summary : teaser}
        </p>
        {!expanded && (
          <span className="text-xs font-medium text-foreground underline underline-offset-2">
            {t.story.readFullPerspective}
          </span>
        )}
      </button>

      {expanded && perspective.claims.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border/60 p-4 pt-3">
          <span className="text-xs font-medium text-muted-foreground">{t.story.keyClaims}</span>
          <ul className="flex flex-col gap-1.5">
            {perspective.claims.map((claim, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/40" aria-hidden />
                {claim}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="mt-2 self-start text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {t.common.showLess}
          </button>
        </div>
      )}
    </article>
  );
}

export function Perspectives({
  perspectiveA,
  perspectiveB,
}: {
  perspectiveA: Perspective;
  perspectiveB: Perspective;
}) {
  return (
    <section aria-labelledby="perspectives-heading" className="flex flex-col gap-3">
      <h2 id="perspectives-heading" className="font-serif text-lg font-semibold text-foreground">
        {t.story.twoPerspectives}
      </h2>
      <div className="flex flex-col gap-4 lg:flex-row">
        <PerspectiveCard label={t.story.perspectiveA} perspective={perspectiveA} />
        <PerspectiveCard label={t.story.perspectiveB} perspective={perspectiveB} />
      </div>
    </section>
  );
}
