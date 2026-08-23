"use client";

import { useState } from "react";
import Link from "next/link";
import type { Post } from "@/types/domain";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PostFeedCard, type FeedPost } from "@/components/posts/post-feed-card";
import { usePosts } from "@/lib/posts/posts-context";
import { communityPostToFeedPost } from "@/lib/posts/to-feed-post";
import { sortByRank } from "@/lib/posts/rank";
import { t } from "@/lib/i18n";

function toFeedPost(post: Post): FeedPost {
  return {
    id: post.id,
    displayName: post.displayName,
    content: post.content,
    createdAt: post.createdAt,
    likeCount: post.likeCount,
    replyCount: post.replyCount,
  };
}

export function ReactionsFeed({
  posts,
  perspectiveAName,
  perspectiveBName,
  storySlug,
}: {
  posts: Post[];
  perspectiveAName: string;
  perspectiveBName: string;
  storySlug: string;
}) {
  const [tab, setTab] = useState<"A" | "B">("A");
  const { communityPosts } = usePosts();

  // Real, classified reader posts mixed in with the seeded reactions above
  // — sortByRank naturally weights toward real posts over time, since seed
  // posts never accumulate real persisted likes but real ones do.
  const realForStory = communityPosts.filter((p) => p.relatedStorySlug === storySlug);
  const realA = realForStory.filter((p) => p.perspective === "A").map(communityPostToFeedPost);
  const realB = realForStory.filter((p) => p.perspective === "B").map(communityPostToFeedPost);

  const postsA = sortByRank([...posts.filter((p) => p.perspective === "A").map(toFeedPost), ...realA]);
  const postsB = sortByRank([...posts.filter((p) => p.perspective === "B").map(toFeedPost), ...realB]);

  if (postsA.length === 0 && postsB.length === 0) return null;

  return (
    <section aria-labelledby="reactions-heading" className="flex flex-col gap-3">
      <h2 id="reactions-heading" className="font-serif text-lg font-semibold text-foreground">
        {t.story.publicReactions}
      </h2>
      <p className="text-xs text-muted-foreground">{t.story.publicReactionsDisclaimer}</p>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "A" | "B")}>
        <TabsList className="w-full">
          <TabsTrigger value="A" className="min-w-0">
            <span className="truncate">{perspectiveAName}</span>
            <span className="shrink-0">({postsA.length})</span>
          </TabsTrigger>
          <TabsTrigger value="B" className="min-w-0">
            <span className="truncate">{perspectiveBName}</span>
            <span className="shrink-0">({postsB.length})</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="A">
          <ul className="-mx-4 flex flex-col divide-y divide-border/40">
            {postsA.map((post) => (
              <PostFeedCard key={post.id} post={post} />
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="B">
          <ul className="-mx-4 flex flex-col divide-y divide-border/40">
            {postsB.map((post) => (
              <PostFeedCard key={post.id} post={post} />
            ))}
          </ul>
        </TabsContent>
      </Tabs>
      <Link
        href={`/posts?story=${storySlug}`}
        className="self-start text-xs font-medium text-foreground underline underline-offset-2"
      >
        {t.story.seeMoreReactions}
      </Link>
    </section>
  );
}
