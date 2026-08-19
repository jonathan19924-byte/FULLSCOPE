"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreatePostForm } from "@/components/posts/create-post-form";
import type { Category } from "@/types/domain";
import { t } from "@/lib/i18n";

/** Lets a reader write a post about the story they're currently reading,
 * without leaving the page — opens the same composer used by /create, with
 * this story pre-tagged and locked in (see CreatePostForm's lockedStory
 * prop). Closes itself on a successful post rather than navigating to
 * /posts, since the new post already appears inline in this story's "From
 * readers" section via the shared posts context. */
export function CreatePostDialog({
  story,
  children,
}: {
  story: { slug: string; title: string; category: Category };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<div />}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.posts.createPageTitle}</DialogTitle>
        </DialogHeader>
        <CreatePostForm lockedStory={story} onPosted={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
