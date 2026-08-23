"use client";

import { useState } from "react";
import { Bookmark, MessageSquare } from "lucide-react";
import type { StorySummary } from "@/types/domain";
import { useBookmarks } from "@/lib/bookmarks/bookmarks-context";
import { usePostBookmarks } from "@/lib/bookmarks/post-bookmarks-context";
import { usePosts } from "@/lib/posts/posts-context";
import { communityPostToFeedPost } from "@/lib/posts/to-feed-post";
import { PaginatedStoryList } from "@/components/story/paginated-story-list";
import { PostFeedCard } from "@/components/posts/post-feed-card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface BookmarksPageClientProps {
  stories: StorySummary[];
  /** Set when embedded in the Home page's Bookmarks tab, which already has
   * its own outer layout and tab context — skips the standalone page's
   * wrapper/heading so the two don't double up. */
  hideHeading?: boolean;
}

export function BookmarksPageClient({ stories, hideHeading }: BookmarksPageClientProps) {
  const { bookmarkedSlugs, isReady: storiesReady } = useBookmarks();
  const { bookmarkedPostIds, isReady: postsReady } = usePostBookmarks();
  const { communityPosts } = usePosts();
  const [tab, setTab] = useState<"stories" | "posts">("stories");

  const bookmarkedStories = stories.filter((s) => bookmarkedSlugs.includes(s.slug));
  const bookmarkedPosts = communityPosts
    .filter((p) => bookmarkedPostIds.includes(p.id))
    .map(communityPostToFeedPost);

  const storiesContent = !storiesReady ? null : bookmarkedStories.length === 0 ? (
    <EmptyState icon={Bookmark} title={t.bookmarks.emptyTitle} description={t.bookmarks.emptyDescription} />
  ) : (
    <PaginatedStoryList stories={bookmarkedStories} />
  );

  const postsContent = !postsReady ? null : bookmarkedPosts.length === 0 ? (
    <EmptyState
      icon={MessageSquare}
      title={t.bookmarks.emptyPostsTitle}
      description={t.bookmarks.emptyPostsDescription}
    />
  ) : (
    <ul className="-mx-4 flex flex-col divide-y divide-border/40">
      {bookmarkedPosts.map((post) => (
        <PostFeedCard key={post.id} post={post} />
      ))}
    </ul>
  );

  const content = (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        {(["stories", "posts"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={tab === option}
            onClick={() => setTab(option)}
            className={cn(
              "flex-1 rounded-full border py-2 text-sm font-medium transition-colors",
              tab === option
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
            )}
          >
            {option === "stories" ? t.bookmarks.storiesTab : t.bookmarks.postsTab}
          </button>
        ))}
      </div>
      {tab === "stories" ? storiesContent : postsContent}
    </div>
  );

  if (hideHeading) return content;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-6 pb-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
          {t.bookmarks.title}
        </h1>
        <p className="text-sm text-muted-foreground">{t.bookmarks.description}</p>
      </div>
      {content}
    </div>
  );
}
