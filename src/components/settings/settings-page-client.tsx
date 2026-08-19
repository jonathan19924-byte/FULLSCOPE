"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Bell,
  ChevronRight,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Newspaper,
  ShieldOff,
  Sun,
  Trash2,
  User,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/components/auth/user-provider";
import { signOutAction } from "@/lib/auth/actions";
import { buttonVariants } from "@/components/ui/button";
import { BackButton } from "@/components/shared/back-button";
import { ProfileEditDialog } from "@/components/settings/profile-edit-dialog";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { NotificationPreferenceToggle } from "@/components/settings/notification-preference-toggle";
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
        aria-label={t.settings.comingSoonAria(title)}
        className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
      >
        {t.settings.comingSoonBadge}
      </span>
    </div>
  );
}

export function SettingsPageClient({
  myProfile,
}: {
  myProfile: {
    username: string | null;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    pushEnabled: boolean;
    eventUpdatesEnabled: boolean;
    postInteractionsEnabled: boolean;
  } | null;
}) {
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
          {user ? (
            <ProfileEditDialog myProfile={myProfile}>
              <button
                type="button"
                className="flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-muted/50"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="size-4.5 text-muted-foreground" strokeWidth={1.75} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{t.settings.profileInfo}</p>
                  <p className="text-sm text-muted-foreground">
                    {myProfile?.username ? (
                      <span dir="ltr" className="inline-block">@{myProfile.username}</span>
                    ) : (
                      t.settings.profileInfoDescription
                    )}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" strokeWidth={1.75} />
              </button>
            </ProfileEditDialog>
          ) : (
            <ComingSoonRow icon={User} title={t.settings.profileInfo} description={t.settings.profileInfoDescription} />
          )}
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
          ) : null}
          {user && (
            <DeleteAccountDialog>
              <button
                type="button"
                className="flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-muted/50"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                  <Trash2 className="size-4.5 text-destructive" strokeWidth={1.75} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-destructive">{t.settings.deleteAccount}</p>
                  <p className="text-sm text-muted-foreground">{t.settings.deleteAccountDescription}</p>
                </div>
              </button>
            </DeleteAccountDialog>
          )}
          {!user && (
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
          {user && myProfile ? (
            <>
              <NotificationPreferenceToggle
                icon={Bell}
                title={t.settings.pushNotifications}
                description={t.settings.pushNotificationsDescription}
                preferenceKey="push_enabled"
                defaultChecked={myProfile.pushEnabled}
              />
              <NotificationPreferenceToggle
                icon={Newspaper}
                title={t.settings.eventUpdates}
                description={t.settings.eventUpdatesDescription}
                preferenceKey="event_updates_enabled"
                defaultChecked={myProfile.eventUpdatesEnabled}
              />
              <NotificationPreferenceToggle
                icon={Heart}
                title={t.settings.postInteractions}
                description={t.settings.postInteractionsDescription}
                preferenceKey="post_interactions_enabled"
                defaultChecked={myProfile.postInteractionsEnabled}
              />
            </>
          ) : (
            <>
              <DisabledToggleRow icon={Bell} title={t.settings.pushNotifications} description={t.settings.pushNotificationsDescription} />
              <DisabledToggleRow icon={Newspaper} title={t.settings.eventUpdates} description={t.settings.eventUpdatesDescription} />
              <DisabledToggleRow icon={Heart} title={t.settings.postInteractions} description={t.settings.postInteractionsDescription} />
            </>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t.settings.privacySafety}
        </h2>
        <div className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
          {user && (
            <Link
              href="/settings/blocked"
              className="flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-muted/50"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <ShieldOff className="size-4.5 text-muted-foreground" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">{t.settings.blockedAccounts}</p>
                <p className="text-sm text-muted-foreground">{t.settings.blockedAccountsDescription}</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" strokeWidth={1.75} />
            </Link>
          )}
          <Link
            href="/privacy"
            className="flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-muted/50"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <Lock className="size-4.5 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{t.privacy.title}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" strokeWidth={1.75} />
          </Link>
        </div>
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
