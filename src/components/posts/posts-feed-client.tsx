"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CirclePlus, MessageSquare } from "lucide-react";
import type { SeedPostWithStory, StandaloneSeedPost } from "@/types/domain";
import { usePosts } from "@/lib/posts/posts-context";
import { PostFeedCard, type FeedPost } from "@/components/posts/post-feed-card";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";

export function PostsFeedClient({
  seedPosts,
  standalonePosts,
  storyFilterSlug,
}: {
  seedPosts: SeedPostWithStory[];
  standalonePosts: StandaloneSeedPost[];
  storyFilterSlug?: string;
}) {
  const { communityPosts, isReady } = usePosts();

  const feed = useMemo<FeedPost[]>(() => {
    const fromCommunity: FeedPost[] = communityPosts.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      content: p.content,
      createdAt: p.createdAt,
      likeCount: 0,
      replyCount: 0,
      story:
        p.relatedStorySlug && p.relatedStoryTitle && p.relatedStoryCategory
          ? {
              slug: p.relatedStorySlug,
              title: p.relatedStoryTitle,
              category: p.relatedStoryCategory,
            }
          : undefined,
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

    return [...fromCommunity, ...fromSeed, ...fromStandalone].sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : -1,
    );
  }, [communityPosts, seedPosts, standalonePosts]);

  const visibleFeed = storyFilterSlug
    ? feed.filter((post) => post.story?.slug === storyFilterSlug)
    : feed;
  const filteredStoryTitle = storyFilterSlug
    ? visibleFeed[0]?.story?.title
    : undefined;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-6 pb-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          Posts
        </h1>
        <Link
          href="/create"
          className={buttonVariants({ variant: "default", size: "sm", className: "gap-1.5 rounded-full" })}
        >
          <CirclePlus className="size-4" strokeWidth={1.75} />
          Post
        </Link>
      </div>

      {storyFilterSlug ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5 text-sm">
          <span className="min-w-0 truncate text-muted-foreground">
            Showing reactions to{" "}
            <span className="font-medium text-foreground">
              {filteredStoryTitle ?? "this story"}
            </span>
          </span>
          <Link
            href="/posts"
            className="shrink-0 text-xs font-medium text-foreground underline underline-offset-2"
          >
            View all posts
          </Link>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Join the conversation — react to a story, or post your own take.
        </p>
      )}

      {!isReady ? null : visibleFeed.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No posts yet"
          description="Be the first to share what you think."
          action={
            <Link href="/create" className={buttonVariants({ variant: "default" })}>
              Write a post
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border/60 border-t border-border/60">
          {visibleFeed.map((post) => (
            <PostFeedCard key={post.id} post={post} />
          ))}
        </ul>
      )}
    </div>
  );
}
