import type { CommunityPost } from "@/types/domain";
import type { FeedPost } from "@/components/posts/post-feed-card";

export function communityPostToFeedPost(p: CommunityPost): FeedPost {
  return {
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
        ? { slug: p.relatedStorySlug, title: p.relatedStoryTitle, category: p.relatedStoryCategory }
        : undefined,
    contributionTheme: p.contributionTheme,
    communityPostId: p.id,
    likedByMe: p.likedByMe,
    mediaUrl: p.mediaUrl,
  };
}
