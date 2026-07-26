import type { Metadata } from "next";
import { getAllSeedPosts, getStandaloneSeedPosts } from "@/lib/services/story-service";
import { PostsFeedClient } from "@/components/posts/posts-feed-client";

export const metadata: Metadata = { title: "Posts" };

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ story?: string }>;
}) {
  const params = await searchParams;
  const [seedPosts, standalonePosts] = await Promise.all([
    getAllSeedPosts(),
    getStandaloneSeedPosts(),
  ]);
  return (
    <PostsFeedClient
      seedPosts={seedPosts}
      standalonePosts={standalonePosts}
      storyFilterSlug={params.story}
    />
  );
}
