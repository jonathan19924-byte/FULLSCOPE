import type { Metadata } from "next";
import { getAllSeedPosts, getStandaloneSeedPosts } from "@/lib/services/story-service";
import { PostsFeedClient } from "@/components/posts/posts-feed-client";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.posts.pageTitle };

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
