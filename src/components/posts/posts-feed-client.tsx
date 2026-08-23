"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { CirclePlus, MessageSquare, UserRound } from "lucide-react";
import type { SeedPostWithStory, StandaloneSeedPost } from "@/types/domain";
import { usePosts } from "@/lib/posts/posts-context";
import { useFollows } from "@/lib/follows/follows-context";
import { useUser } from "@/components/auth/user-provider";
import { PostFeedCard, type FeedPost } from "@/components/posts/post-feed-card";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { sortByRank } from "@/lib/posts/rank";

export function PostsFeedClient({
  seedPosts,
  standalonePosts,
  storyFilterSlug,
  postFilterId,
}: {
  seedPosts: SeedPostWithStory[];
  standalonePosts: StandaloneSeedPost[];
  storyFilterSlug?: string;
  postFilterId?: string;
}) {
  const { communityPosts, isReady } = usePosts();
  const { followingIds } = useFollows();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [tab, setTab] = useState<"all" | "following">("all");

  function handleTabClick(option: "all" | "following") {
    if (option === "following" && !user) {
      toast(t.profile.signInToFollow);
      router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setTab(option);
  }

  const feed = useMemo<FeedPost[]>(() => {
    const fromCommunity: FeedPost[] = communityPosts.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      authorUsername: p.username,
      authorUserId: p.userId,
      authorAvatarUrl: p.authorAvatarUrl,
      content: p.content,
      createdAt: p.createdAt,
      likeCount: p.likeCount,
      replyCount: p.commentCount,
      story:
        p.relatedStorySlug && p.relatedStoryTitle && p.relatedStoryCategory
          ? {
              slug: p.relatedStorySlug,
              title: p.relatedStoryTitle,
              category: p.relatedStoryCategory,
            }
          : undefined,
      contributionTheme: p.contributionTheme,
      communityPostId: p.id,
      likedByMe: p.likedByMe,
      mediaUrl: p.mediaUrl,
    }));

    const fromSeed: FeedPost[] = seedPosts.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      content: p.content,
      createdAt: p.createdAt,
      likeCount: p.likeCount,
      replyCount: p.replyCount,
      story: { slug: p.storySlug, title: p.storyTitle, category: p.storyCategory },
    }));

    const fromStandalone: FeedPost[] = standalonePosts.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      content: p.content,
      createdAt: p.createdAt,
      likeCount: p.likeCount,
      replyCount: p.replyCount,
    }));

    return sortByRank([...fromCommunity, ...fromSeed, ...fromStandalone]);
  }, [communityPosts, seedPosts, standalonePosts]);

  const storyFiltered = storyFilterSlug
    ? feed.filter((post) => post.story?.slug === storyFilterSlug)
    : feed;
  const postFiltered = postFilterId ? feed.filter((post) => post.id === postFilterId) : storyFiltered;
  const visibleFeed =
    tab === "following"
      ? postFiltered.filter((post) => post.authorUserId && followingIds.includes(post.authorUserId))
      : postFiltered;
  const filteredStoryTitle = storyFilterSlug
    ? storyFiltered[0]?.story?.title
    : undefined;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-6 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {t.posts.pageTitle}
        </h1>
        <Link
          href="/create"
          className={buttonVariants({ variant: "default", size: "sm", className: "gap-1.5 rounded-full" })}
        >
          <CirclePlus className="size-4" strokeWidth={1.75} />
          {t.posts.writePost}
        </Link>
      </div>

      {!storyFilterSlug && !postFilterId ? (
        <div className="flex gap-2">
          {(["all", "following"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={tab === option}
              onClick={() => handleTabClick(option)}
              className={cn(
                "flex-1 rounded-full border py-2 text-sm font-medium transition-colors",
                tab === option
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
            >
              {option === "all" ? t.posts.allTab : t.posts.followingTab}
            </button>
          ))}
        </div>
      ) : null}

      {postFilterId ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5 text-sm">
          <span className="text-muted-foreground">{t.posts.showingSinglePost}</span>
          <Link
            href="/posts"
            className="shrink-0 text-xs font-medium text-foreground underline underline-offset-2"
          >
            {t.posts.viewAllPosts}
          </Link>
        </div>
      ) : storyFilterSlug ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5 text-sm">
          <span className="min-w-0 truncate text-muted-foreground">
            {t.posts.showingReactionsTo}
            <span className="font-medium text-foreground">
              {filteredStoryTitle ?? t.posts.thisStory}
            </span>
          </span>
          <Link
            href="/posts"
            className="shrink-0 text-xs font-medium text-foreground underline underline-offset-2"
          >
            {t.posts.viewAllPosts}
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t.posts.joinConversation}</p>
      )}

      {!isReady ? null : visibleFeed.length === 0 ? (
        tab === "following" ? (
          <EmptyState
            icon={UserRound}
            title={t.posts.followingEmptyTitle}
            description={t.posts.followingEmptyDescription}
            action={
              <Link href="/search" className={buttonVariants({ variant: "default" })}>
                {t.posts.findPeopleCta}
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={MessageSquare}
            title={t.posts.emptyTitle}
            description={t.posts.emptyDescription}
            action={
              <Link href="/create" className={buttonVariants({ variant: "default" })}>
                {t.posts.writePostCta}
              </Link>
            }
          />
        )
      ) : (
        <ul className="-mx-4 flex flex-col divide-y divide-border/40">
          {visibleFeed.map((post) => (
            <PostFeedCard key={post.id} post={post} />
          ))}
        </ul>
      )}
    </div>
  );
}
