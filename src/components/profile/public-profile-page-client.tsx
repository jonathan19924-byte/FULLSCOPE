"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import type { PublicProfile } from "@/types/domain";
import { usePosts } from "@/lib/posts/posts-context";
import { useUser } from "@/components/auth/user-provider";
import { useBlocks } from "@/lib/safety/blocks-context";
import { PostFeedCard, type FeedPost } from "@/components/posts/post-feed-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FollowButton } from "@/components/profile/follow-button";
import { BackButton } from "@/components/shared/back-button";
import { buttonVariants } from "@/components/ui/button";
import { ReportDialog } from "@/components/safety/report-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Flag, MessageSquare, MoreHorizontal, Settings, UserX } from "lucide-react";
import { initials } from "@/lib/format";
import { t } from "@/lib/i18n";

export function PublicProfilePageClient({ profile }: { profile: PublicProfile }) {
  const { user } = useUser();
  const { communityPosts } = usePosts();
  const { isBlocked, toggleBlock } = useBlocks();
  const router = useRouter();
  const pathname = usePathname();
  const [reportOpen, setReportOpen] = useState(false);

  const isOwnProfile = user?.id === profile.userId;
  const displayName = profile.displayName || profile.username;
  const blocked = isBlocked(profile.userId);

  function requireSignIn(message: string) {
    toast(message);
    router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
  }

  function handleReport() {
    if (!user) {
      requireSignIn(t.safety.signInToReport);
      return;
    }
    setReportOpen(true);
  }

  function handleBlock() {
    if (!user) {
      requireSignIn(t.safety.signInToBlock);
      return;
    }
    toggleBlock(profile.userId);
    toast(
      blocked
        ? t.safety.unblockedToast(profile.username ?? displayName)
        : t.safety.blockedToast(profile.username ?? displayName),
      blocked ? undefined : { description: t.safety.blockedToastDescription },
    );
  }

  const theirPosts: FeedPost[] = communityPosts
    .filter((p) => p.userId === profile.userId)
    .map((p) => ({
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
          <div className="flex shrink-0 items-center gap-1">
            <FollowButton userId={profile.userId} />
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={t.safety.moreOptionsAria}
                render={
                  <button
                    type="button"
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  />
                }
              >
                <MoreHorizontal className="size-4" strokeWidth={1.75} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleReport}>
                  <Flag className="size-3.5" strokeWidth={1.75} />
                  {t.safety.reportUser}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleBlock}>
                  <UserX className="size-3.5" strokeWidth={1.75} />
                  {blocked ? t.safety.unblock : t.safety.blockUser(profile.username ?? displayName)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {reportOpen && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetType="user"
          targetId={profile.userId}
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link
          href={`/profile/${profile.username}/followers`}
          className="flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card py-3 transition-colors hover:border-border"
        >
          <span className="text-lg font-semibold text-foreground">{profile.followerCount}</span>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t.profile.followers}
          </span>
        </Link>
        <Link
          href={`/profile/${profile.username}/following`}
          className="flex flex-col items-center gap-1 rounded-2xl border border-border/60 bg-card py-3 transition-colors hover:border-border"
        >
          <span className="text-lg font-semibold text-foreground">{profile.followingCount}</span>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t.profile.followingCount}
          </span>
        </Link>
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
