"use client";

import type { User } from "@supabase/supabase-js";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { UserProvider } from "@/components/auth/user-provider";
import { BookmarksProvider } from "@/lib/bookmarks/bookmarks-context";
import { DislikesProvider } from "@/lib/dislikes/dislikes-context";
import { PostsProvider } from "@/lib/posts/posts-context";
import { FollowsProvider } from "@/lib/follows/follows-context";
import { NotificationsProvider } from "@/lib/notifications/notifications-context";
import type { CommunityPost, Notification } from "@/types/domain";

export function Providers({
  initialUser,
  initialBookmarkedSlugs,
  initialDislikedSlugs,
  initialCommunityPosts,
  initialFollowingIds,
  myProfile,
  initialNotifications,
  initialUnreadCount,
  signedIn,
  children,
}: {
  initialUser: User | null;
  initialBookmarkedSlugs: string[];
  initialDislikedSlugs: string[];
  initialCommunityPosts: CommunityPost[];
  initialFollowingIds: string[];
  myProfile: { username: string | null; displayName: string | null } | null;
  initialNotifications: Notification[];
  initialUnreadCount: number;
  signedIn: boolean;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider delay={200}>
        <UserProvider initialUser={initialUser}>
          <BookmarksProvider initialSlugs={initialBookmarkedSlugs}>
            <DislikesProvider initialSlugs={initialDislikedSlugs}>
              <FollowsProvider initialFollowingIds={initialFollowingIds}>
                <PostsProvider initialPosts={initialCommunityPosts} myProfile={myProfile}>
                  <NotificationsProvider
                    initialNotifications={initialNotifications}
                    initialUnreadCount={initialUnreadCount}
                    signedIn={signedIn}
                  >
                    {children}
                    <Toaster position="bottom-center" />
                  </NotificationsProvider>
                </PostsProvider>
              </FollowsProvider>
            </DislikesProvider>
          </BookmarksProvider>
        </UserProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
