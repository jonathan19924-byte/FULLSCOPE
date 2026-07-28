"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StorySummary } from "@/types/domain";
import { usePosts } from "@/lib/posts/posts-context";
import { useUser } from "@/components/auth/user-provider";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

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
      toast(t.posts.couldntPost, { description: result.error });
      return;
    }

    toast(t.posts.posted, { description: t.posts.postedDescription });
    router.push("/posts");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!user ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5 text-sm">
          <span className="text-muted-foreground">{t.posts.signInToPost}</span>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/sign-in?next=${encodeURIComponent(pathname)}`}
              className="font-medium text-foreground underline underline-offset-2"
            >
              {t.common.signIn}
            </Link>
            <Link
              href={`/sign-up?next=${encodeURIComponent(pathname)}`}
              className="font-medium text-foreground underline underline-offset-2"
            >
              {t.common.signUp}
            </Link>
          </div>
        </div>
      ) : null}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">{t.posts.whatsOnYourMind}</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
          placeholder={t.posts.shareReactionPlaceholder}
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
        <span className="text-sm font-medium text-foreground">{t.posts.tagRelatedStory}</span>
        <select
          value={relatedSlug}
          onChange={(e) => setRelatedSlug(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-background px-3.5 text-[15px] text-foreground outline-none focus-visible:border-foreground/40"
        >
          <option value="">{t.posts.noneStandalone}</option>
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
        {isSubmitting ? t.posts.posting : t.posts.post}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t.posts.visibleToEveryone}</p>
    </form>
  );
}
