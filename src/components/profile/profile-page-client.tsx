"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bell,
  Bookmark,
  ChevronDown,
  Heart,
  LogOut,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  Pencil,
  Settings,
  TrendingUp,
} from "lucide-react";
import { CATEGORY_META } from "@/lib/category";
import { CATEGORIES } from "@/types/domain";
import { cn } from "@/lib/utils";
import { useBookmarks } from "@/lib/bookmarks/bookmarks-context";
import { usePosts } from "@/lib/posts/posts-context";
import { useNotifications } from "@/lib/notifications/notifications-context";
import { useUser } from "@/components/auth/user-provider";
import { signOutAction } from "@/lib/auth/actions";
import { initials } from "@/lib/format";
import { PostFeedCard, type FeedPost } from "@/components/posts/post-feed-card";
import { EmptyState } from "@/components/shared/empty-state";
import { t } from "@/lib/i18n";

const VISIBLE_PREFERENCE_CATEGORY_COUNT = 5;

export function ProfilePageClient({
  followerCount,
  followingCount,
}: {
  followerCount: number;
  followingCount: number;
}) {
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const { bookmarkedSlugs, isReady: bookmarksReady } = useBookmarks();
  const { communityPosts, isReady: postsReady } = usePosts();
  const { unreadCount } = useNotifications();
  const { user } = useUser();
  const isReady = bookmarksReady && postsReady;
  const email = user?.email ?? "";
  const displayName = email ? email.split("@")[0] : t.profile.guestReader;

  const WELL_RECEIVED_THRESHOLD = 3;
  const WELL_RECEIVED_MAX = 5;

  const myPosts = communityPosts.filter((p) => p.userId === user?.id);
  const myContributions = myPosts.filter((p) => p.contributionTheme);
  const myLikesReceived = myPosts.reduce((sum, p) => sum + p.likeCount, 0);
  // "Impact" isn't only the rare trend-detection credit (needs 2+ readers
  // making the same point, confirmed by Claude) — most active users would
  // otherwise always see the empty state. Surface everyday well-received
  // posts too, using engagement data already loaded client-side.
  const myWellReceived = myPosts
    .filter((p) => !p.contributionTheme && p.likeCount + p.commentCount >= WELL_RECEIVED_THRESHOLD)
    .sort((a, b) => b.likeCount + b.commentCount - (a.likeCount + a.commentCount))
    .slice(0, WELL_RECEIVED_MAX);
  const hasAnyImpact = myContributions.length > 0 || myWellReceived.length > 0;

  const myFeedPosts: FeedPost[] = myPosts.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    authorUsername: p.username,
    content: p.content,
    createdAt: p.createdAt,
    likeCount: p.likeCount,
    replyCount: p.commentCount,
    story:
      p.relatedStorySlug && p.relatedStoryTitle && p.relatedStoryCategory
        ? { slug: p.relatedStorySlug, title: p.relatedStoryTitle, category: p.relatedStoryCategory }
        : undefined,
    contributionTheme: p.contributionTheme,
    communityPostId: p.id,
    likedByMe: p.likedByMe,
    mediaUrl: p.mediaUrl,
  }));

  const followStats = [
    { label: t.profile.followers, value: followerCount, href: "/profile/followers" },
    { label: t.profile.followingCount, value: followingCount, href: "/profile/following" },
  ];

  const stats = [
    { label: t.profile.statPosts, value: isReady ? myPosts.length : 0 },
    { label: t.profile.statLikes, value: isReady ? myLikesReceived : 0 },
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
        {followStats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card py-3 transition-colors hover:border-border"
          >
            <span className="text-lg font-semibold text-foreground">{stat.value}</span>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card py-3"
          >
            <span className="text-lg font-semibold text-foreground">{stat.value}</span>
            <span className="text-center text-[11px] uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">{t.profile.postsSectionTitle}</h2>
        {isReady && myFeedPosts.length === 0 ? (
          <EmptyState icon={MessageSquare} title={t.posts.emptyTitle} description={t.posts.emptyDescription} />
        ) : (
          <ul className="flex flex-col divide-y divide-border/60 border-t border-border/60">
            {myFeedPosts.map((post) => (
              <PostFeedCard key={post.id} post={post} />
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <TrendingUp className="size-4" strokeWidth={1.75} />
          {t.profile.yourImpact}
        </h2>
        {hasAnyImpact ? (
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
            {myWellReceived.length > 0 && (
              <>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {t.profile.wellReceivedTitle}
                </p>
                {myWellReceived.map((post) => (
                  <li
                    key={post.id}
                    className="flex flex-col gap-1.5 rounded-2xl border border-border/60 bg-card p-4"
                  >
                    <p className="line-clamp-2 text-sm text-foreground">{post.content}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="size-3.5" strokeWidth={1.75} />
                        {post.likeCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="size-3.5" strokeWidth={1.75} />
                        {post.commentCount}
                      </span>
                    </div>
                  </li>
                ))}
              </>
            )}
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
          href="/notifications"
          className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-border"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
              <Bell className="size-5 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div>
              <p className="font-medium text-foreground">{t.profile.notificationsRowTitle}</p>
              <p className="text-sm text-muted-foreground">{t.profile.notificationsRowDescription}</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-destructive text-xs font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

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
