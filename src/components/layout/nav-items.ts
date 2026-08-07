import { Home, Search, CirclePlus, MessageSquare, Bell, User } from "lucide-react";

// Kept in English per explicit request — an exception to the rest of the
// Hebrew UI translation. Shared by both the desktop top nav and the mobile
// bottom tab bar (only one is ever visible at a time, by breakpoint), so
// this covers both rather than leaving them mismatched.
export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/create", label: "Create", icon: CirclePlus },
  { href: "/posts", label: "Posts", icon: MessageSquare },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
] as const;
