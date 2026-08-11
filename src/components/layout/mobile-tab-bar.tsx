"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, scrollToTop } from "@/lib/utils";
import { NAV_ITEMS, AUTH_ROUTE_PREFIXES } from "./nav-items";
import { t } from "@/lib/i18n";

export function MobileTabBar() {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isAuthRoute) return null;

  return (
    <nav
      aria-label={t.nav.primaryAria}
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={(e) => {
                  if (isActive) {
                    e.preventDefault();
                    scrollToTop();
                  }
                }}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon
                  className={cn("size-5", isActive && "fill-foreground/10")}
                  strokeWidth={isActive ? 2.25 : 1.75}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
