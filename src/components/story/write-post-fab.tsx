"use client";

import { Plus } from "lucide-react";
import { CreatePostDialog } from "@/components/story/create-post-dialog";
import type { Category } from "@/types/domain";
import { t } from "@/lib/i18n";

/** A persistently visible way to write a post about the story being read —
 * the inline "write post" button in CommunityPosts sits at the bottom of a
 * long page and is easy to miss/never scroll to. This floats above the
 * mobile tab bar (bottom-20, matching the tab-bar clearance already used by
 * SiteShell's <main>) for the whole time the reader is on the page. */
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
        className="fixed bottom-20 end-4 z-30 flex size-13 items-center justify-center rounded-full bg-brand-gold text-background shadow-lg transition-transform active:scale-95 md:bottom-6"
      >
        <Plus className="size-6" strokeWidth={2} />
      </button>
    </CreatePostDialog>
  );
}
