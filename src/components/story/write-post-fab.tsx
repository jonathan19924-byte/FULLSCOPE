"use client";

import { Plus } from "lucide-react";
import { CreatePostDialog } from "@/components/story/create-post-dialog";
import type { Category } from "@/types/domain";
import { t } from "@/lib/i18n";

/** A persistently visible way to write a post about the story being read —
 * the inline "write post" button in CommunityPosts sits at the bottom of a
 * long page and is easy to miss/never scroll to. This floats above the
 * mobile tab bar for the whole time the reader is on the page.
 *
 * The bottom offset adds env(safe-area-inset-bottom) on top of the tab
 * bar's own content height — MobileTabBar pads itself by that same env()
 * value for the home-indicator area on notched phones, so a fixed
 * `bottom-20` (no safe-area awareness) sits shorter than the real bar on
 * those devices and gets partially covered by it. */
export function WritePostFab({
  story,
}: {
  story: { slug: string; title: string; category: Category };
}) {
  return (
    <CreatePostDialog story={story}>
      <button
        type="button"
        aria-label={t.posts.writePostCta}
        className="fixed z-30 end-4 flex size-13 items-center justify-center rounded-full bg-brand-gold text-background shadow-lg transition-transform active:scale-95 bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6"
      >
        <Plus className="size-6" strokeWidth={2} />
      </button>
    </CreatePostDialog>
  );
}
