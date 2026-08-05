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
    <nav className="flex border-b border-border/60">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "relative flex-1 px-4 py-3 text-center text-sm font-medium transition-colors hover:bg-muted/40",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-foreground" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
