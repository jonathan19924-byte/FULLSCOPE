"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StorySummary } from "@/types/domain";
import { usePosts } from "@/lib/posts/posts-context";
import { useUser } from "@/components/auth/user-provider";
import { Button } from "@/components/ui/button";

const MAX_LENGTH = 280;

export function CreatePostForm({ stories }: { stories: StorySummary[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { addPost } = usePosts();
  const [content, setContent] = useState("");
  const [relatedSlug, setRelatedSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remaining = MAX_LENGTH - content.length;
  const trimmed = content.trim();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed || !user) return;

    setIsSubmitting(true);

    const relatedStory = stories.find((s) => s.slug === relatedSlug);
    const result = await addPost({
      content: trimmed,
      relatedStorySlug: relatedStory?.slug,
      relatedStoryTitle: relatedStory?.title,
      relatedStoryCategory: relatedStory?.category,
    });

    setIsSubmitting(false);

    if ("error" in result) {
      toast("Couldn't post that", { description: result.error });
      return;
    }

    toast("Posted", { description: "Your post is now on the Posts feed." });
    router.push("/posts");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!user ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5 text-sm">
          <span className="text-muted-foreground">Sign in to post</span>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/sign-in?next=${encodeURIComponent(pathname)}`}
              className="font-medium text-foreground underline underline-offset-2"
            >
              Sign in
            </Link>
            <Link
              href={`/sign-up?next=${encodeURIComponent(pathname)}`}
              className="font-medium text-foreground underline underline-offset-2"
            >
              Sign up
            </Link>
          </div>
        </div>
      ) : null}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">What&apos;s on your mind?</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
          placeholder="Share your reaction to the news…"
          rows={5}
          autoFocus
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-foreground/40"
        />
        <span
          className={`self-end text-xs ${remaining < 0 ? "text-destructive" : "text-muted-foreground"}`}
        >
          {remaining}
        </span>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Tag a related story (optional)</span>
        <select
          value={relatedSlug}
          onChange={(e) => setRelatedSlug(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-background px-3.5 text-[15px] text-foreground outline-none focus-visible:border-foreground/40"
        >
          <option value="">None — standalone post</option>
          {stories.map((story) => (
            <option key={story.slug} value={story.slug}>
              {story.title}
            </option>
          ))}
        </select>
      </label>

      <Button
        type="submit"
        size="lg"
        disabled={!user || !trimmed || remaining < 0 || isSubmitting}
        className="h-12 w-full rounded-full"
      >
        {isSubmitting ? "Posting…" : "Post"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Posts are visible to everyone on the Posts feed.
      </p>
    </form>
  );
}
