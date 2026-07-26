"use client";

import { useRouter, usePathname } from "next/navigation";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBookmarks } from "@/lib/bookmarks/bookmarks-context";
import { useUser } from "@/components/auth/user-provider";

interface BookmarkButtonProps {
  slug: string;
  title: string;
  variant?: "icon" | "labeled";
  className?: string;
}

export function BookmarkButton({
  slug,
  title,
  variant = "icon",
  className,
}: BookmarkButtonProps) {
  const { isBookmarked, toggleBookmark, isReady } = useBookmarks();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const bookmarked = isReady && isBookmarked(slug);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast("Sign in to bookmark stories");
      router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
      return;
    }

    toggleBookmark(slug);
    toast(bookmarked ? "Removed from bookmarks" : "Saved to bookmarks", {
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
      aria-label={bookmarked ? `Remove ${title} from bookmarks` : `Bookmark ${title}`}
      className={cn("rounded-full", className)}
    >
      <Bookmark
        className={cn(bookmarked && "fill-current")}
        strokeWidth={bookmarked ? 2.25 : 1.75}
      />
      {variant === "labeled" && (bookmarked ? "Bookmarked" : "Bookmark")}
    </Button>
  );
}
