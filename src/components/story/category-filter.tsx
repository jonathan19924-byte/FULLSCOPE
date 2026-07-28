import Link from "next/link";
import { CATEGORIES, type Category } from "@/types/domain";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface CategoryFilterProps {
  selected: Category | "All";
  counts: Record<Category | "All", number>;
}

export function CategoryFilter({ selected, counts }: CategoryFilterProps) {
  const options: (Category | "All")[] = ["All", ...CATEGORIES];

  return (
    <nav
      aria-label={t.story.filterByCategoryAria}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
    >
      {options.map((option) => {
        const isActive = option === selected;
        const href = option === "All" ? "/" : `/?category=${option}`;
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
    </nav>
  );
}
