"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Bell,
  ChevronRight,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Newspaper,
  Sun,
  User,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/components/auth/user-provider";
import { signOutAction } from "@/lib/auth/actions";
import { buttonVariants } from "@/components/ui/button";
import { BackButton } from "@/components/shared/back-button";
import { t } from "@/lib/i18n";

const THEME_OPTIONS = [
  { value: "light", label: t.settings.themeLight, icon: Sun },
  { value: "dark", label: t.settings.themeDark, icon: Moon },
  { value: "system", label: t.settings.themeSystem, icon: Monitor },
] as const;

function ComingSoonRow({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        toast(t.settings.comingSoonToast(title), {
          description: t.settings.comingSoonDescription,
        })
      }
      className="flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-muted/50"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4.5 text-muted-foreground" strokeWidth={1.75} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" strokeWidth={1.75} />
    </button>
  );
}

function DisabledToggleRow({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4.5 text-muted-foreground" strokeWidth={1.75} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <span
        aria-disabled="true"
        aria-label={t.settings.comingSoonAria(title)}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed items-center rounded-full bg-muted opacity-60"
      >
        <span className="inline-block size-4.5 translate-x-0.5 rounded-full bg-background shadow-sm" />
      </span>
    </div>
  );
}

export function SettingsPageClient() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-10">
      <div className="flex items-center gap-3">
        <BackButton ariaLabel={t.settings.backAria} />
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {t.settings.title}
        </h1>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t.settings.account}
        </h2>
        <div className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
          <ComingSoonRow icon={User} title={t.settings.profileInfo} description={t.settings.profileInfoDescription} />
          {user ? (
            <div className="flex w-full items-center gap-3 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <Mail className="size-4.5 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{user.email}</p>
                <p className="text-sm text-muted-foreground">{t.settings.signedIn}</p>
              </div>
              <button
                type="button"
                onClick={() => signOutAction()}
                aria-label={t.settings.signOutAria}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <LogOut className="size-3.5" strokeWidth={1.75} />
                {t.settings.signOut}
              </button>
            </div>
          ) : (
            <div className="flex w-full items-center gap-3 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <Mail className="size-4.5 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{t.settings.notSignedIn}</p>
                <p className="text-sm text-muted-foreground">{t.settings.signInToBookmarkAndPost}</p>
              </div>
              <Link href="/sign-in" className={buttonVariants({ variant: "outline", size: "sm", className: "rounded-full" })}>
                {t.settings.signIn}
              </Link>
            </div>
          )}
        </div>
        <p className="px-1 text-xs text-muted-foreground">
          {user ? t.settings.fullEditingComingSoon : t.settings.signInDescription}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t.settings.notifications}
        </h2>
        <div className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
          <DisabledToggleRow icon={Bell} title={t.settings.pushNotifications} description={t.settings.pushNotificationsDescription} />
          <DisabledToggleRow icon={Newspaper} title={t.settings.eventUpdates} description={t.settings.eventUpdatesDescription} />
          <DisabledToggleRow icon={Heart} title={t.settings.postInteractions} description={t.settings.postInteractionsDescription} />
        </div>
        <p className="px-1 text-xs text-muted-foreground">{t.settings.plannedForFuture}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t.settings.appearance}
        </h2>
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
    </div>
  );
}
