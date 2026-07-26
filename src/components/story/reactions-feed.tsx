"use client";

import { useState } from "react";
import Link from "next/link";
import type { Post } from "@/types/domain";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PostFeedCard, type FeedPost } from "@/components/posts/post-feed-card";

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
  const postsA = posts.filter((p) => p.perspective === "A");
  const postsB = posts.filter((p) => p.perspective === "B");

  if (posts.length === 0) return null;

  return (
    <section aria-labelledby="reactions-heading" className="flex flex-col gap-3">
      <h2 id="reactions-heading" className="font-serif text-lg font-semibold text-foreground">
        Public reactions
      </h2>
      <p className="text-xs text-muted-foreground">
        A sample of reactions representing each perspective. Visual only in this preview.
      </p>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "A" | "B")}>
        <TabsList className="w-full">
          <TabsTrigger value="A">{perspectiveAName} ({postsA.length})</TabsTrigger>
          <TabsTrigger value="B">{perspectiveBName} ({postsB.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="A">
          <ul className="flex flex-col divide-y divide-border/60 border-t border-border/60">
            {postsA.map((post) => (
              <PostFeedCard key={post.id} post={toFeedPost(post)} />
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="B">
          <ul className="flex flex-col divide-y divide-border/60 border-t border-border/60">
            {postsB.map((post) => (
              <PostFeedCard key={post.id} post={toFeedPost(post)} />
            ))}
          </ul>
        </TabsContent>
      </Tabs>
      <Link
        href={`/posts?story=${storySlug}`}
        className="self-start text-xs font-medium text-foreground underline underline-offset-2"
      >
        See more reactions
      </Link>
    </section>
  );
}
