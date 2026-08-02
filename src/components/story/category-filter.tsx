"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { CATEGORIES, type Category } from "@/types/domain";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface CategoryFilterProps {
  selected: Category | "All";
  counts: Record<Category | "All", number>;
}

/** Shown by default before the "More" toggle — chosen so the row still fits
 * comfortably without scrolling/wrapping on mobile. Expanded from 4 to 9
 * categories on 2026-08-02 (see CONTENT_PIPELINE.md); rather than let the
 * chip row either scroll indefinitely or wrap into a wall of pills, this
 * collapses the long tail behind an expand toggle. */
const VISIBLE_CATEGORY_COUNT = 4;

export function CategoryFilter({ selected, counts }: CategoryFilterProps) {
  const options: (Category | "All")[] = ["All", ...CATEGORIES];
  const visibleOptions = options.slice(0, VISIBLE_CATEGORY_COUNT + 1); // +1 for "All"
  const hiddenOptions = options.slice(VISIBLE_CATEGORY_COUNT + 1);
  // If the currently-active filter is one of the collapsed categories,
  // start expanded so the active chip is never hidden from view.
  const [expanded, setExpanded] = useState(() => hiddenOptions.includes(selected));

  const shown = expanded ? options : visibleOptions;

  return (
    <nav
      aria-label={t.story.filterByCategoryAria}
      className="-mx-4 flex flex-wrap gap-2 px-4 pb-1 sm:mx-0 sm:px-0"
    >
      {shown.map((option) => {
        const isActive = option === selected;
        const href = option === "All" ? "/" : `/?category=${encodeURIComponent(option)}`;
        return (
          <Link
            key={option}
            href={href}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {option === "All" ? t.common.all : t.category[option]}
            <span className={cn(isActive ? "opacity-70" : "opacity-60")}> ({counts[option]})</span>
          </Link>
        );
      })}
      {hiddenOptions.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex shrink-0 items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
        >
          {expanded ? t.common.showLess : t.story.moreCategories(hiddenOptions.length)}
          <ChevronDown
            className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
            strokeWidth={1.75}
          />
        </button>
      )}
    </nav>
  );
}
