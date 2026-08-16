"use client";

import { MessageSquarePlus } from "lucide-react";
import { usePosts } from "@/lib/posts/posts-context";
import { PostFeedCard, type FeedPost } from "@/components/posts/post-feed-card";
import { CreatePostDialog } from "@/components/story/create-post-dialog";
import type { Category } from "@/types/domain";
import { t } from "@/lib/i18n";
import { sortByRank } from "@/lib/posts/rank";

export function CommunityPosts({
  story,
}: {
  story: { slug: string; title: string; category: Category };
}) {
  const { communityPosts, isReady } = usePosts();

  if (!isReady) return null;

  const matches = sortByRank(communityPosts.filter((p) => p.relatedStorySlug === story.slug));

  const feed: FeedPost[] = matches.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    authorUsername: p.username,
    authorUserId: p.userId,
    authorAvatarUrl: p.authorAvatarUrl,
    content: p.content,
    createdAt: p.createdAt,
    likeCount: p.likeCount,
    replyCount: p.commentCount,
    contributionTheme: p.contributionTheme,
    communityPostId: p.id,
    likedByMe: p.likedByMe,
    mediaUrl: p.mediaUrl,
  }));

  return (
    <section aria-labelledby="community-posts-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="community-posts-heading" className="font-serif text-lg font-semibold text-foreground">
          {t.story.fromReaders}
        </h2>
        <CreatePostDialog story={story}>
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <MessageSquarePlus className="size-4" strokeWidth={1.75} />
            {t.posts.writePostCta}
          </button>
        </CreatePostDialog>
      </div>
      {feed.length > 0 && (
        <ul className="flex flex-col divide-y divide-border/60 border-t border-border/60">
          {feed.map((post) => (
            <PostFeedCard key={post.id} post={post} />
          ))}
        </ul>
      )}
    </section>
  );
}
