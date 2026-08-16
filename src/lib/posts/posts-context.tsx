"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Category, CommunityPost } from "@/types/domain";
import { createCommunityPostAction, toggleCommunityPostLikeAction } from "./actions";
import { useUser } from "@/components/auth/user-provider";
import { t } from "@/lib/i18n";

interface PostsContextValue {
  communityPosts: CommunityPost[];
  addPost: (input: {
    content: string;
    relatedStorySlug?: string;
    relatedStoryTitle?: string;
    relatedStoryCategory?: Category;
    mediaUrl?: string;
  }) => Promise<{ success: true; mediaRejected: boolean } | { error: string }>;
  toggleLike: (postId: string) => Promise<{ success: true } | { error: string }>;
  isReady: boolean;
}

const PostsContext = createContext<PostsContextValue | null>(null);

export function PostsProvider({
  initialPosts,
  myProfile,
  children,
}: {
  initialPosts: CommunityPost[];
  myProfile: { username: string | null; displayName: string | null; avatarUrl: string | null } | null;
  children: React.ReactNode;
}) {
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(initialPosts);
  const { user } = useUser();

  // initialPosts only seeds useState on first mount — without this, a
  // router.refresh() (pull-to-refresh, or a revalidatePath after posting
  // elsewhere) re-fetches fresh data in the root layout's Server Component
  // but this already-mounted client provider would never see it. Adjusting
  // state during render (rather than in an effect) avoids an extra
  // cascading re-render — this is React's documented pattern for syncing
  // state from a changed prop.
  const [prevInitialPosts, setPrevInitialPosts] = useState(initialPosts);
  if (initialPosts !== prevInitialPosts) {
    setPrevInitialPosts(initialPosts);
    setCommunityPosts(initialPosts);
  }

  const addPost = useCallback<PostsContextValue["addPost"]>(
    async (input) => {
      const optimisticPost: CommunityPost = {
        id: `optimistic-${Date.now()}`,
        userId: user?.id ?? "",
        displayName: myProfile?.displayName || myProfile?.username || t.profile.guestReader,
        username: myProfile?.username ?? undefined,
        authorAvatarUrl: myProfile?.avatarUrl ?? undefined,
        content: input.content,
        createdAt: new Date().toISOString(),
        relatedStorySlug: input.relatedStorySlug,
        relatedStoryTitle: input.relatedStoryTitle,
        relatedStoryCategory: input.relatedStoryCategory,
        likeCount: 0,
        likedByMe: false,
        mediaUrl: input.mediaUrl,
        commentCount: 0,
      };

      setCommunityPosts((current) => [optimisticPost, ...current]);

      const result = await createCommunityPostAction(input);

      if ("error" in result) {
        setCommunityPosts((current) => current.filter((p) => p.id !== optimisticPost.id));
      } else if (result.mediaRejected) {
        setCommunityPosts((current) =>
          current.map((p) => (p.id === optimisticPost.id ? { ...p, mediaUrl: undefined } : p)),
        );
      }

      return result;
    },
    [user?.id, myProfile?.displayName, myProfile?.username, myProfile?.avatarUrl],
  );

  const toggleLike = useCallback<PostsContextValue["toggleLike"]>(async (postId) => {
    // Optimistic flip — rolled back below if the server call fails.
    setCommunityPosts((current) =>
      current.map((p) =>
        p.id === postId
          ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
          : p,
      ),
    );

    const result = await toggleCommunityPostLikeAction(postId);

    if ("error" in result) {
      setCommunityPosts((current) =>
        current.map((p) =>
          p.id === postId
            ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
            : p,
        ),
      );
      return result;
    }

    setCommunityPosts((current) =>
      current.map((p) => (p.id === postId ? { ...p, likedByMe: result.liked, likeCount: result.likeCount } : p)),
    );
    return { success: true };
  }, []);

  const value = useMemo(
    () => ({ communityPosts, addPost, toggleLike, isReady: true }),
    [communityPosts, addPost, toggleLike],
  );

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>;
}

export function usePosts() {
  const ctx = useContext(PostsContext);
  if (!ctx) {
    throw new Error("usePosts must be used within a PostsProvider");
  }
  return ctx;
}
