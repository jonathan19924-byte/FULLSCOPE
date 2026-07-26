"use client";

import type { User } from "@supabase/supabase-js";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { UserProvider } from "@/components/auth/user-provider";
import { BookmarksProvider } from "@/lib/bookmarks/bookmarks-context";
import { PostsProvider } from "@/lib/posts/posts-context";
import type { CommunityPost } from "@/types/domain";

export function Providers({
  initialUser,
  initialBookmarkedSlugs,
  initialCommunityPosts,
  children,
}: {
  initialUser: User | null;
  initialBookmarkedSlugs: string[];
  initialCommunityPosts: CommunityPost[];
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider delay={200}>
        <UserProvider initialUser={initialUser}>
          <BookmarksProvider initialSlugs={initialBookmarkedSlugs}>
            <PostsProvider initialPosts={initialCommunityPosts}>
              {children}
              <Toaster position="bottom-center" />
            </PostsProvider>
          </BookmarksProvider>
        </UserProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
