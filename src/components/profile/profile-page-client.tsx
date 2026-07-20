"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { MessageSquareText, Moon, Sun, Monitor, UserRound } from "lucide-react";
import { CATEGORY_META } from "@/lib/category";
import { CATEGORIES } from "@/types/domain";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ProfilePageClient() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-10">
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
        Profile
      </h1>

      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserRound className="size-6 text-muted-foreground" strokeWidth={1.5} />
        </div>
        <div>
          <p className="font-medium text-foreground">Guest reader</p>
          <p className="text-sm text-muted-foreground">
            Accounts and cross-device sync are planned for a future version.
          </p>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Appearance</h2>
        <div className="flex gap-2">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = mounted && theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-colors",
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
                )}
              >
                <Icon className="size-4.5" strokeWidth={1.75} />
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Content preferences</h2>
        <p className="text-sm text-muted-foreground">
          Personalized recommendations are planned for a future version. For now, every category is shown to every reader.
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const meta = CATEGORY_META[category];
            const Icon = meta.icon;
            return (
              <span
                key={category}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                  meta.bg,
                  meta.text,
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.75} />
                {category}
              </span>
            );
          })}
        </div>
      </section>

      <Link
        href="/feedback"
        className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-border"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <MessageSquareText className="size-5 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-medium text-foreground">Send Feedback</p>
            <p className="text-sm text-muted-foreground">Tell us what&apos;s working and what isn&apos;t</p>
          </div>
        </div>
      </Link>
    </div>
  );
}
