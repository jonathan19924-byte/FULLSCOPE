"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bookmark, ChevronDown, LogOut, MessageSquareText, Pencil, Settings, TrendingUp } from "lucide-react";
import { CATEGORY_META } from "@/lib/category";
import { CATEGORIES } from "@/types/domain";
import { cn } from "@/lib/utils";
import { useBookmarks } from "@/lib/bookmarks/bookmarks-context";
import { usePosts } from "@/lib/posts/posts-context";
import { useUser } from "@/components/auth/user-provider";
import { signOutAction } from "@/lib/auth/actions";
import { initials } from "@/lib/format";
import { t } from "@/lib/i18n";

const VISIBLE_PREFERENCE_CATEGORY_COUNT = 5;

export function ProfilePageClient() {
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const { bookmarkedSlugs, isReady: bookmarksReady } = useBookmarks();
  const { communityPosts, isReady: postsReady } = usePosts();
  const { user } = useUser();
  const isReady = bookmarksReady && postsReady;
  const email = user?.email ?? "";
  const displayName = email ? email.split("@")[0] : t.profile.guestReader;

  const myPostCount = communityPosts.filter((p) => p.userId === user?.id).length;
  const myContributions = communityPosts.filter((p) => p.userId === user?.id && p.contributionTheme);

  const stats = [
    { label: t.profile.statPosts, value: isReady ? myPostCount : 0 },
    { label: t.profile.statBookmarks, value: isReady ? bookmarkedSlugs.length : 0 },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {t.profile.title}
        </h1>
        <Link
          href="/settings"
          aria-label={t.profile.settingsAria}
          className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-muted"
        >
          <Settings className="size-5 text-muted-foreground" strokeWidth={1.75} />
        </Link>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted">
          <span className="text-lg font-medium text-muted-foreground">
            {initials(displayName)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{displayName}</p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() =>
              toast(t.profile.editComingSoon, {
                description: t.profile.editComingSoonDescription,
              })
            }
            aria-label={t.profile.editProfileAria}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Pencil className="size-3.5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => signOutAction()}
            aria-label={t.profile.signOutAria}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <LogOut className="size-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card py-3"
          >
            <span className="text-lg font-semibold text-foreground">{stat.value}</span>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <TrendingUp className="size-4" strokeWidth={1.75} />
          {t.profile.yourImpact}
        </h2>
        {myContributions.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {myContributions.map((post) => (
              <li
                key={post.id}
                className="flex flex-col gap-1 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4"
              >
                <p className="text-sm font-medium text-foreground">{post.contributionTheme}</p>
                <p className="text-xs text-muted-foreground">
                  {t.profile.yourPostShaped}
                  {post.relatedStorySlug ? (
                    <Link href={`/story/${post.relatedStorySlug}`} className="underline underline-offset-2">
                      {post.relatedStoryTitle ?? t.profile.thisStory}
                    </Link>
                  ) : (
                    (post.relatedStoryTitle ?? t.profile.aStory)
                  )}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-8 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted">
              <TrendingUp className="size-5 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <p className="font-medium text-foreground">{t.profile.impactEmptyTitle}</p>
            <p className="max-w-xs text-sm text-muted-foreground">{t.profile.impactEmptyDescription}</p>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t.profile.contentPreferences}</h2>
        <p className="text-sm text-muted-foreground">{t.profile.contentPreferencesDescription}</p>
        <div className="flex flex-wrap gap-2">
          {(categoriesExpanded ? CATEGORIES : CATEGORIES.slice(0, VISIBLE_PREFERENCE_CATEGORY_COUNT)).map(
            (category) => {
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
                  {meta.label}
                </span>
              );
            },
          )}
          {CATEGORIES.length > VISIBLE_PREFERENCE_CATEGORY_COUNT && (
            <button
              type="button"
              onClick={() => setCategoriesExpanded((v) => !v)}
              aria-expanded={categoriesExpanded}
              className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              {categoriesExpanded
                ? t.common.showLess
                : t.story.moreCategories(CATEGORIES.length - VISIBLE_PREFERENCE_CATEGORY_COUNT)}
              <ChevronDown
                className={cn("size-3.5 transition-transform", categoriesExpanded && "rotate-180")}
                strokeWidth={1.75}
              />
            </button>
          )}
        </div>
      </section>

      <div className="flex flex-col gap-2.5">
        <Link
          href="/bookmarks"
          className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-border"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <Bookmark className="size-5 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-medium text-foreground">{t.profile.bookmarksRowTitle}</p>
              <p className="text-sm text-muted-foreground">{t.profile.bookmarksRowDescription}</p>
            </div>
          </div>
        </Link>

        <Link
          href="/feedback"
          className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-border"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <MessageSquareText className="size-5 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-medium text-foreground">{t.profile.sendFeedbackTitle}</p>
              <p className="text-sm text-muted-foreground">{t.profile.sendFeedbackDescription}</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
