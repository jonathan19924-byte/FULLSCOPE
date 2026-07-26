"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  ArrowLeft,
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

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
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
        toast(`${title} is coming in a future version`, {
          description: "Full accounts aren't part of this preview yet.",
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
        aria-label={`${title} — planned for a future version`}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed items-center rounded-full bg-muted opacity-60"
      >
        <span className="inline-block size-4.5 translate-x-0.5 rounded-full bg-background shadow-sm" />
      </span>
    </div>
  );
}

export function SettingsPageClient() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-10">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-5 rtl:rotate-180" strokeWidth={1.75} />
        </button>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Account
        </h2>
        <div className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
          <ComingSoonRow icon={User} title="Profile info" description="Name, handle, bio, avatar" />
          {user ? (
            <div className="flex w-full items-center gap-3 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <Mail className="size-4.5 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{user.email}</p>
                <p className="text-sm text-muted-foreground">Signed in</p>
              </div>
              <button
                type="button"
                onClick={() => signOutAction()}
                aria-label="Sign out"
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <LogOut className="size-3.5" strokeWidth={1.75} />
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex w-full items-center gap-3 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <Mail className="size-4.5 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">Not signed in</p>
                <p className="text-sm text-muted-foreground">Sign in to bookmark and post</p>
              </div>
              <Link href="/sign-in" className={buttonVariants({ variant: "outline", size: "sm", className: "rounded-full" })}>
                Sign in
              </Link>
            </div>
          )}
        </div>
        <p className="px-1 text-xs text-muted-foreground">
          {user
            ? "Full profile editing is coming in a future version."
            : "Sign in to bookmark stories and post your own reactions."}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Notifications
        </h2>
        <div className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
          <DisabledToggleRow icon={Bell} title="Push notifications" description="Enable or disable push notifications" />
          <DisabledToggleRow icon={Newspaper} title="Event updates" description="Get alerts when key stories change" />
          <DisabledToggleRow icon={Heart} title="Post interactions" description="Likes, replies, mentions" />
        </div>
        <p className="px-1 text-xs text-muted-foreground">Planned for a future version.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Appearance
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
