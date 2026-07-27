"use client";

import { usePosts } from "@/lib/posts/posts-context";
import { PostFeedCard, type FeedPost } from "@/components/posts/post-feed-card";

export function CommunityPosts({ storySlug }: { storySlug: string }) {
  const { communityPosts, isReady } = usePosts();

  if (!isReady) return null;

  const matches = communityPosts.filter((p) => p.relatedStorySlug === storySlug);
  if (matches.length === 0) return null;

  const feed: FeedPost[] = matches.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    content: p.content,
    createdAt: p.createdAt,
    likeCount: 0,
    replyCount: 0,
    contributionTheme: p.contributionTheme,
  }));

  return (
    <section aria-labelledby="community-posts-heading" className="flex flex-col gap-3">
      <h2 id="community-posts-heading" className="font-serif text-lg font-semibold text-foreground">
        From readers
      </h2>
      <ul className="flex flex-col divide-y divide-border/60 border-t border-border/60">
        {feed.map((post) => (
          <PostFeedCard key={post.id} post={post} />
        ))}
      </ul>
    </section>
  );
}
