"use client";

import type { User } from "@supabase/supabase-js";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { UserProvider } from "@/components/auth/user-provider";
import { BookmarksProvider } from "@/lib/bookmarks/bookmarks-context";
import { PostBookmarksProvider } from "@/lib/bookmarks/post-bookmarks-context";
import { DislikesProvider } from "@/lib/dislikes/dislikes-context";
import { PostsProvider } from "@/lib/posts/posts-context";
import { FollowsProvider } from "@/lib/follows/follows-context";
import { BlocksProvider } from "@/lib/safety/blocks-context";
import { NotificationsProvider } from "@/lib/notifications/notifications-context";
import { PushRegistration } from "@/components/push/push-registration";
import type { CommunityPost, Notification } from "@/types/domain";

export function Providers({
  initialUser,
  initialBookmarkedSlugs,
  initialBookmarkedPostIds,
  initialDislikedSlugs,
  initialCommunityPosts,
  initialFollowingIds,
  initialBlockedIds,
  myProfile,
  initialNotifications,
  initialUnreadCount,
  signedIn,
  children,
}: {
  initialUser: User | null;
  initialBookmarkedSlugs: string[];
  initialBookmarkedPostIds: string[];
  initialDislikedSlugs: string[];
  initialCommunityPosts: CommunityPost[];
  initialFollowingIds: string[];
  initialBlockedIds: string[];
  myProfile: { username: string | null; displayName: string | null; avatarUrl: string | null } | null;
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
            <PostBookmarksProvider initialPostIds={initialBookmarkedPostIds}>
              <DislikesProvider initialSlugs={initialDislikedSlugs}>
                <FollowsProvider initialFollowingIds={initialFollowingIds}>
                  <BlocksProvider initialBlockedIds={initialBlockedIds}>
                    <PostsProvider initialPosts={initialCommunityPosts} myProfile={myProfile}>
                      <NotificationsProvider
                        initialNotifications={initialNotifications}
                        initialUnreadCount={initialUnreadCount}
                        signedIn={signedIn}
                      >
                        <PushRegistration signedIn={signedIn} />
                        {children}
                        <Toaster position="bottom-center" />
                      </NotificationsProvider>
                    </PostsProvider>
                  </BlocksProvider>
                </FollowsProvider>
              </DislikesProvider>
            </PostBookmarksProvider>
          </BookmarksProvider>
        </UserProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
