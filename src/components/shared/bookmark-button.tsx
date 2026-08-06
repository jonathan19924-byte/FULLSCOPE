"use client";

import { useRouter, usePathname } from "next/navigation";
import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBookmarks } from "@/lib/bookmarks/bookmarks-context";
import { useDislikes } from "@/lib/dislikes/dislikes-context";
import { useUser } from "@/components/auth/user-provider";
import { t } from "@/lib/i18n";

interface BookmarkButtonProps {
  slug: string;
  title: string;
  variant?: "icon" | "labeled";
  className?: string;
}

/** User-facing name is "Like" (renamed from Bookmark after real users didn't
 * recognize the bookmark-ribbon icon as a like action) — underlying
 * mechanism, data model, and route are unchanged, only the words and icon
 * changed. Mutually exclusive with DislikeButton — see toggleBookmarkAction. */
export function BookmarkButton({
  slug,
  title,
  variant = "icon",
  className,
}: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark, isReady } = useBookmarks();
  const { removeDislikeLocally } = useDislikes();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const bookmarked = isReady && isBookmarked(slug);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast(t.shared.signInToBookmark);
      router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
      return;
    }

    toggleBookmark(slug);
    if (!bookmarked) removeDislikeLocally(slug);
    toast(bookmarked ? t.shared.removedFromBookmarks : t.shared.savedToBookmarks, {
      description: title,
    });
  }

  return (
    <Button
      type="button"
      variant={variant === "icon" ? "ghost" : bookmarked ? "secondary" : "outline"}
      size={variant === "icon" ? "icon" : "sm"}
      onClick={handleClick}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? t.shared.removeFromBookmarksAria(title) : t.shared.bookmarkAria(title)}
      className={cn("rounded-full", className)}
    >
      <ThumbsUp
        className={cn(bookmarked && "fill-current")}
        strokeWidth={bookmarked ? 2.25 : 1.75}
      />
      {variant === "labeled" && (bookmarked ? t.shared.bookmarked : t.shared.bookmark)}
    </Button>
  );
}
