import { Home, Search, CirclePlus, MessageSquare, User } from "lucide-react";

// Kept in English per explicit request — an exception to the rest of the
// Hebrew UI translation. Shared by both the desktop top nav and the mobile
// bottom tab bar (only one is ever visible at a time, by breakpoint), so
// this covers both rather than leaving them mismatched.
export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/create", label: "Create", icon: CirclePlus },
  { href: "/posts", label: "Posts", icon: MessageSquare },
  { href: "/profile", label: "Profile", icon: User },
] as const;

// Routes a logged-out user lands on mid-auth-flow, where the primary nav
// points at destinations that aren't really available yet — hidden on both
// the desktop top nav and the mobile bottom tab bar.
export const AUTH_ROUTE_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
] as const;
