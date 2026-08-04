"use client";

import Link from "next/link";
import type { PublicProfile } from "@/types/domain";
import { usePosts } from "@/lib/posts/posts-context";
import { useUser } from "@/components/auth/user-provider";
import { PostFeedCard, type FeedPost } from "@/components/posts/post-feed-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FollowButton } from "@/components/profile/follow-button";
import { BackButton } from "@/components/shared/back-button";
import { buttonVariants } from "@/components/ui/button";
import { MessageSquare, Settings } from "lucide-react";
import { initials } from "@/lib/format";
import { t } from "@/lib/i18n";

export function PublicProfilePageClient({ profile }: { profile: PublicProfile }) {
  const { user } = useUser();
  const { communityPosts } = usePosts();

  const isOwnProfile = user?.id === profile.userId;
  const displayName = profile.displayName || profile.username;

  const theirPosts: FeedPost[] = communityPosts
    .filter((p) => p.userId === profile.userId)
    .map((p) => ({
      id: p.id,
      displayName: p.displayName,
      authorUsername: p.username,
      content: p.content,
      createdAt: p.createdAt,
      likeCount: p.likeCount,
      replyCount: 0,
      story:
        p.relatedStorySlug && p.relatedStoryTitle && p.relatedStoryCategory
          ? { slug: p.relatedStorySlug, title: p.relatedStoryTitle, category: p.relatedStoryCategory }
          : undefined,
      contributionTheme: p.contributionTheme,
      communityPostId: p.id,
      likedByMe: p.likedByMe,
      mediaUrl: p.mediaUrl,
    }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-10">
      <div className="flex items-center gap-3">
        <BackButton ariaLabel={t.settings.backAria} />
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {displayName}
        </h1>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted">
          <span className="text-lg font-medium text-muted-foreground">
            {initials(displayName)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{displayName}</p>
          <p className="truncate text-sm text-muted-foreground">
            <span dir="ltr" className="inline-block">@{profile.username}</span>
          </p>
          {profile.bio ? <p className="mt-1 text-sm text-foreground/90">{profile.bio}</p> : null}
        </div>
        {isOwnProfile ? (
          <Link
            href="/settings"
            className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0 rounded-full gap-1.5" })}
          >
            <Settings className="size-3.5" strokeWidth={1.75} />
            {t.profile.editProfileAria}
          </Link>
        ) : (
          <FollowButton userId={profile.userId} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card py-3">
          <span className="text-lg font-semibold text-foreground">{profile.followerCount}</span>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t.profile.followers}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card py-3">
          <span className="text-lg font-semibold text-foreground">{profile.followingCount}</span>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t.profile.followingCount}
          </span>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">{t.profile.postsSectionTitle}</h2>
        {theirPosts.length === 0 ? (
          <EmptyState icon={MessageSquare} title={t.posts.emptyTitle} description={t.posts.emptyDescription} />
        ) : (
          <ul className="flex flex-col divide-y divide-border/60 border-t border-border/60">
            {theirPosts.map((post) => (
              <PostFeedCard key={post.id} post={post} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
