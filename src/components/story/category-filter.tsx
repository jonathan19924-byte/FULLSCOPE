import Link from "next/link";
import { CATEGORIES, type Category } from "@/types/domain";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  selected: Category | "All";
}

export function CategoryFilter({ selected }: CategoryFilterProps) {
  const options: (Category | "All")[] = ["All", ...CATEGORIES];

  return (
    <nav
      aria-label="Filter stories by category"
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
            {option}
          </Link>
        );
      })}
    </nav>
  );
}
