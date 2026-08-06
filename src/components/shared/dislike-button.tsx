"use client";

import { useRouter, usePathname } from "next/navigation";
import { ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDislikes } from "@/lib/dislikes/dislikes-context";
import { useBookmarks } from "@/lib/bookmarks/bookmarks-context";
import { useUser } from "@/components/auth/user-provider";
import { t } from "@/lib/i18n";

interface DislikeButtonProps {
  slug: string;
  title: string;
  className?: string;
}

/** Private signal only — no public count, no list view (unlike Like/
 * bookmarks). Mutually exclusive with the Like button — see
 * toggleDislikeAction. */
export function DislikeButton({ slug, title, className }: DislikeButtonProps) {
  const { isDisliked, toggleDislike, isReady } = useDislikes();
  const { removeBookmarkLocally } = useBookmarks();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const disliked = isReady && isDisliked(slug);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast(t.shared.signInToDislike);
      router.push(`/sign-in?next=${encodeURIComponent(pathname)}`);
      return;
    }

    toggleDislike(slug);
    if (!disliked) removeBookmarkLocally(slug);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      aria-pressed={disliked}
      aria-label={disliked ? t.shared.removeDislikeAria(title) : t.shared.dislikeAria(title)}
      className={cn("rounded-full", className)}
    >
      <ThumbsDown className={cn(disliked && "fill-current")} strokeWidth={disliked ? 2.25 : 1.75} />
    </Button>
  );
}
