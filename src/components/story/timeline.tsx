"use client";

import { useState } from "react";
import { BadgeCheck, CircleAlert, CircleHelp, Newspaper } from "lucide-react";
import type { Confidence, Fact } from "@/types/domain";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const COLLAPSE_LENGTH = 120;

const CONFIDENCE_META: Record<
  Confidence,
  { label: string; icon: typeof BadgeCheck; className: string }
> = {
  confirmed: {
    label: t.story.confidence.confirmed,
    icon: BadgeCheck,
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  reported: {
    label: t.story.confidence.reported,
    icon: Newspaper,
    className: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  },
  disputed: {
    label: t.story.confidence.disputed,
    icon: CircleAlert,
    className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  },
  unknown: {
    label: t.story.confidence.unknown,
    icon: CircleHelp,
    className: "bg-muted text-muted-foreground",
  },
};

function TimelineEntry({ fact, index }: { fact: Fact; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = fact.text.length > COLLAPSE_LENGTH;
  const displayText =
    isLong && !expanded ? `${fact.text.slice(0, COLLAPSE_LENGTH).trim()}…` : fact.text;
  const meta = CONFIDENCE_META[fact.confidence];
  const Icon = meta.icon;

  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      <div className="flex flex-col items-center">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-foreground/15 bg-background text-xs font-medium text-foreground">
          {index + 1}
        </span>
        <span className="mt-1 w-px flex-1 bg-border/70 last:hidden" aria-hidden />
      </div>
      <div className="flex-1 pt-0.5">
        <span
          className={cn(
            "mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            meta.className,
          )}
        >
          <Icon className="size-3" strokeWidth={2} />
          {meta.label}
        </span>
        <p className="text-sm leading-relaxed text-foreground/90">{displayText}</p>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            {expanded ? t.common.showLess : t.common.readMore}
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
      <div>
        <h2 id="timeline-heading" className="font-serif text-lg font-semibold text-foreground">
          {t.story.timeline}
        </h2>
        <p className="text-xs text-muted-foreground">{t.story.timelineDisclaimer}</p>
      </div>
      <ol className="flex flex-col">
        {facts.map((fact, i) => (
          <TimelineEntry key={i} fact={fact} index={i} />
        ))}
      </ol>
    </section>
  );
}
