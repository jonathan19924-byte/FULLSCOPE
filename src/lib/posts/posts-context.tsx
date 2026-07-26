"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Category, CommunityPost } from "@/types/domain";
import { createCommunityPostAction } from "./actions";
import { useUser } from "@/components/auth/user-provider";

interface PostsContextValue {
  communityPosts: CommunityPost[];
  addPost: (input: {
    content: string;
    relatedStorySlug?: string;
    relatedStoryTitle?: string;
    relatedStoryCategory?: Category;
  }) => Promise<{ success: true } | { error: string }>;
  isReady: boolean;
}

const PostsContext = createContext<PostsContextValue | null>(null);

export function PostsProvider({
  initialPosts,
  children,
}: {
  initialPosts: CommunityPost[];
  children: React.ReactNode;
}) {
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(initialPosts);
  const { user } = useUser();

  const addPost = useCallback<PostsContextValue["addPost"]>(
    async (input) => {
      const optimisticPost: CommunityPost = {
        id: `optimistic-${Date.now()}`,
        userId: user?.id ?? "",
        displayName: "Guest Reader",
        content: input.content,
        createdAt: new Date().toISOString(),
        relatedStorySlug: input.relatedStorySlug,
        relatedStoryTitle: input.relatedStoryTitle,
        relatedStoryCategory: input.relatedStoryCategory,
      };

      setCommunityPosts((current) => [optimisticPost, ...current]);

      const result = await createCommunityPostAction(input);

      if ("error" in result) {
        setCommunityPosts((current) => current.filter((p) => p.id !== optimisticPost.id));
      }

      return result;
    },
    [user?.id],
  );

  const value = useMemo(
    () => ({ communityPosts, addPost, isReady: true }),
    [communityPosts, addPost],
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
