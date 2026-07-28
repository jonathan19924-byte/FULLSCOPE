import { Home, Search, CirclePlus, MessageSquare, User } from "lucide-react";
import { t } from "@/lib/i18n";

export const NAV_ITEMS = [
  { href: "/", label: t.nav.home, icon: Home },
  { href: "/search", label: t.nav.search, icon: Search },
  { href: "/create", label: t.nav.create, icon: CirclePlus },
  { href: "/posts", label: t.nav.posts, icon: MessageSquare },
  { href: "/profile", label: t.nav.profile, icon: User },
] as const;
