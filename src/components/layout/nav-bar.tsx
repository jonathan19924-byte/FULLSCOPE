"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, scrollToTop } from "@/lib/utils";
import { NAV_ITEMS, AUTH_ROUTE_PREFIXES } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { t } from "@/lib/i18n";

export function NavBar() {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isAuthRoute) return null;

  return (
    <header className="hidden md:block sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-serif text-xl font-semibold tracking-tight"
        >
          FullScope
        </Link>

        <nav aria-label={t.nav.primaryAria} className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={(e) => {
                  if (isActive) {
                    e.preventDefault();
                    scrollToTop();
                  }
                }}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground",
                  isActive ? "text-brand-gold" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <ThemeToggle />
      </div>
    </header>
  );
}
