"use client";

import { useRouter, usePathname } from "next/navigation";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePostBookmarks } from "@/lib/bookmarks/post-bookmarks-context";
import { useUser } from "@/components/auth/user-provider";
import { t } from "@/lib/i18n";

export function PostBookmarkButton({ postId, className }: { postId: string; className?: string }) {
  const { isPostBookmarked, togglePostBookmark, isReady } = usePostBookmarks();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const bookmarked = isReady && isPostBookmarked(postId);

  function handleClick() {
    if (!user) {
      toast(t.posts.signInToSavePost);
      router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
      return;
    }

    togglePostBookmark(postId);
    toast(bookmarked ? t.posts.removedFromSaved : t.posts.savedPost);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? t.posts.removeSavedPostAria : t.posts.savePostAria}
      className={cn(
        "-m-1.5 flex items-center gap-1 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Bookmark className={cn("size-3.5", bookmarked && "fill-current text-foreground")} strokeWidth={1.75} />
    </button>
  );
}
