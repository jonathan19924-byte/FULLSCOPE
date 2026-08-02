import type { Category } from "@/types/domain";
import {
  Landmark,
  Globe2,
  Cpu,
  FlaskConical,
  Shield,
  Scale,
  Siren,
  Briefcase,
  Users,
  type LucideIcon,
} from "lucide-react";
import { t } from "./i18n";

interface CategoryMeta {
  label: string;
  icon: LucideIcon;
  /** Tailwind utility classes — written out literally so Tailwind's scanner picks them up. */
  text: string;
  bg: string;
  border: string;
  gradient: string;
  /** Solid category color, used sparingly for the thin accent rule on story cards. */
  accent: string;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  Politics: {
    label: t.category.Politics,
    icon: Landmark,
    text: "text-politics",
    bg: "bg-politics-bg",
    border: "border-politics/30",
    gradient: "from-politics/25 via-politics/10 to-transparent",
    accent: "bg-politics",
  },
  World: {
    label: t.category.World,
    icon: Globe2,
    text: "text-world",
    bg: "bg-world-bg",
    border: "border-world/30",
    gradient: "from-world/25 via-world/10 to-transparent",
    accent: "bg-world",
  },
  Technology: {
    label: t.category.Technology,
    icon: Cpu,
    text: "text-technology",
    bg: "bg-technology-bg",
    border: "border-technology/30",
    gradient: "from-technology/25 via-technology/10 to-transparent",
    accent: "bg-technology",
  },
  Science: {
    label: t.category.Science,
    icon: FlaskConical,
    text: "text-science",
    bg: "bg-science-bg",
    border: "border-science/30",
    gradient: "from-science/25 via-science/10 to-transparent",
    accent: "bg-science",
  },
  "Security & Defense": {
    label: t.category["Security & Defense"],
    icon: Shield,
    text: "text-security",
    bg: "bg-security-bg",
    border: "border-security/30",
    gradient: "from-security/25 via-security/10 to-transparent",
    accent: "bg-security",
  },
  "Law & Courts": {
    label: t.category["Law & Courts"],
    icon: Scale,
    text: "text-law",
    bg: "bg-law-bg",
    border: "border-law/30",
    gradient: "from-law/25 via-law/10 to-transparent",
    accent: "bg-law",
  },
  "Crime & Safety": {
    label: t.category["Crime & Safety"],
    icon: Siren,
    text: "text-crime",
    bg: "bg-crime-bg",
    border: "border-crime/30",
    gradient: "from-crime/25 via-crime/10 to-transparent",
    accent: "bg-crime",
  },
  "Business & Economy": {
    label: t.category["Business & Economy"],
    icon: Briefcase,
    text: "text-business",
    bg: "bg-business-bg",
    border: "border-business/30",
    gradient: "from-business/25 via-business/10 to-transparent",
    accent: "bg-business",
  },
  "Society & Religion": {
    label: t.category["Society & Religion"],
    icon: Users,
    text: "text-society",
    bg: "bg-society-bg",
    border: "border-society/30",
    gradient: "from-society/25 via-society/10 to-transparent",
    accent: "bg-society",
  },
};
