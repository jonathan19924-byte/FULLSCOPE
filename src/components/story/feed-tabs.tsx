import Link from "next/link";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface FeedTabsProps {
  active: "feed" | "history" | "bookmarks";
}

/** Same Link+searchParams pattern as CategoryFilter — Server Component
 * friendly, no client state. Switching tabs intentionally drops the
 * category filter (history/bookmarks aren't categorized in this first
 * version). */
export function FeedTabs({ active }: FeedTabsProps) {
  const tabs = [
    { key: "feed" as const, href: "/", label: t.home.feedTab },
    { key: "history" as const, href: "/?view=history", label: t.home.historyTab },
    { key: "bookmarks" as const, href: "/?view=bookmarks", label: t.bookmarks.title },
  ];

  return (
    <nav className="flex gap-2">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
