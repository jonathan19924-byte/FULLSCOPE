import { Home, Search, CirclePlus, MessageSquare, User } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/create", label: "Create", icon: CirclePlus },
  { href: "/posts", label: "Posts", icon: MessageSquare },
  { href: "/profile", label: "Profile", icon: User },
] as const;
