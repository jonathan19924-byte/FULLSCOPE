"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import type { StorySummary } from "@/types/domain";
import { usePosts } from "@/lib/posts/posts-context";
import { CATEGORY_META } from "@/lib/category";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

export function MostDiscussed({ stories }: { stories: StorySummary[] }) {
  const { communityPosts } = usePosts();

  const top = useMemo(() => {
    const localCountBySlug = new Map<string, number>();
    for (const post of communityPosts) {
      if (!post.relatedStorySlug) continue;
      localCountBySlug.set(
        post.relatedStorySlug,
        (localCountBySlug.get(post.relatedStorySlug) ?? 0) + 1,
      );
    }

    return [...stories]
      .map((story) => ({
        story,
        totalPosts: story.postCount + (localCountBySlug.get(story.slug) ?? 0),
      }))
      .filter((s) => s.totalPosts > 0)
      .sort((a, b) => b.totalPosts - a.totalPosts)
      .slice(0, 3);
  }, [stories, communityPosts]);

  if (top.length === 0) return null;

  return (
    <section aria-label={t.story.mostDiscussedAria} className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-muted-foreground">{t.story.mostDiscussed}</h2>
      <div className="flex flex-col gap-2">
        {top.map(({ story, totalPosts }) => {
          const meta = CATEGORY_META[story.category];
          const Icon = meta.icon;
          return (
            <Link
              key={story.id}
              href={`/story/${story.slug}`}
              className="flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/60"
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  meta.bg,
                )}
              >
                <Icon className={cn("size-5", meta.text)} strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn("text-xs font-medium", meta.text)}>{meta.label}</p>
                <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
                  {story.title}
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="size-3.5" strokeWidth={1.75} />
                {totalPosts}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
