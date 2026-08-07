"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { CATEGORIES, type Category } from "@/types/domain";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface CategoryFilterProps {
  selected: Category | "All";
  counts: Record<Category | "All", number>;
  /** Which tab this filter applies to — appended to every option's href so
   * switching category stays on the same tab instead of bouncing back to
   * the feed (the default, since feed is the common case). */
  view?: "feed" | "history";
}

export function CategoryFilter({ selected, counts, view = "feed" }: CategoryFilterProps) {
  const options: (Category | "All")[] = ["All", ...CATEGORIES];
  const selectedLabel = selected === "All" ? t.common.all : t.category[selected];
  const viewParam = view === "history" ? "view=history" : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t.story.filterByCategoryAria}
        render={
          <button
            type="button"
            className="flex w-fit items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground/40"
          />
        }
      >
        {selectedLabel}
        <span className="text-muted-foreground">({counts[selected]})</span>
        <ChevronDown className="size-3.5" strokeWidth={1.75} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option) => {
          const isActive = option === selected;
          const categoryParam = option === "All" ? undefined : `category=${encodeURIComponent(option)}`;
          const query = [viewParam, categoryParam].filter(Boolean).join("&");
          const href = query ? `/?${query}` : "/";
          return (
            <DropdownMenuItem
              key={option}
              render={<Link href={href} aria-current={isActive ? "true" : undefined} />}
              className={cn(isActive && "bg-muted font-medium text-foreground")}
            >
              <span>{option === "All" ? t.common.all : t.category[option]}</span>
              <span className="text-xs text-muted-foreground">{counts[option]}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
