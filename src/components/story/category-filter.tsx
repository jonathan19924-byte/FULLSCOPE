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
}

export function CategoryFilter({ selected, counts }: CategoryFilterProps) {
  const options: (Category | "All")[] = ["All", ...CATEGORIES];
  const selectedLabel = selected === "All" ? t.common.all : t.category[selected];

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
          const href = option === "All" ? "/" : `/?category=${encodeURIComponent(option)}`;
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
