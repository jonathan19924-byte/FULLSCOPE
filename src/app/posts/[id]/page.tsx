import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCommunityPostById } from "@/lib/posts/get-community-post";
import { getPostComments } from "@/lib/posts/get-post-comments";
import { getAllSeedPosts, getStandaloneSeedPosts } from "@/lib/services/story-service";
import { PostDetailClient } from "@/components/posts/post-detail-client";
import { PullToRefresh } from "@/components/shared/pull-to-refresh";
import { t } from "@/lib/i18n";
import type { FeedPost } from "@/components/posts/post-feed-card";

export const dynamic = "force-dynamic";

const findPost = cache(async (id: string): Promise<FeedPost | null> => {
  const communityPost = await getCommunityPostById(id);
  if (communityPost) {
    return {
      id: communityPost.id,
      displayName: communityPost.displayName,
      authorUsername: communityPost.username,
      authorUserId: communityPost.userId,
      authorAvatarUrl: communityPost.authorAvatarUrl,
      content: communityPost.content,
      createdAt: communityPost.createdAt,
      likeCount: communityPost.likeCount,
      replyCount: communityPost.commentCount,
      story:
        communityPost.relatedStorySlug && communityPost.relatedStoryTitle && communityPost.relatedStoryCategory
          ? {
              slug: communityPost.relatedStorySlug,
              title: communityPost.relatedStoryTitle,
              category: communityPost.relatedStoryCategory,
            }
          : undefined,
      contributionTheme: communityPost.contributionTheme,
      communityPostId: communityPost.id,
      likedByMe: communityPost.likedByMe,
      mediaUrl: communityPost.mediaUrl,
    };
  }

  const [seedPosts, standalonePosts] = await Promise.all([getAllSeedPosts(), getStandaloneSeedPosts()]);

  const seedPost = seedPosts.find((p) => p.id === id);
  if (seedPost) {
    return {
      id: seedPost.id,
      displayName: seedPost.displayName,
      content: seedPost.content,
      createdAt: seedPost.createdAt,
      likeCount: seedPost.likeCount,
      replyCount: seedPost.replyCount,
      story: { slug: seedPost.storySlug, title: seedPost.storyTitle, category: seedPost.storyCategory },
    };
  }

  const standalonePost = standalonePosts.find((p) => p.id === id);
  if (standalonePost) {
    return {
      id: standalonePost.id,
      displayName: standalonePost.displayName,
      content: standalonePost.content,
      createdAt: standalonePost.createdAt,
      likeCount: standalonePost.likeCount,
      replyCount: standalonePost.replyCount,
    };
  }

  return null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await findPost(id);
  if (!post) return { title: t.posts.postNotFound };
  return { title: `${post.displayName}: ${post.content.slice(0, 60)}` };
}

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await findPost(id);

  if (!post) notFound();

  const comments = post.communityPostId ? await getPostComments(post.communityPostId) : [];

  return (
    <PullToRefresh>
      <PostDetailClient post={post} initialComments={comments} />
    </PullToRefresh>
  );
}
