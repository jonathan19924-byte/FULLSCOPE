"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare, TrendingUp } from "lucide-react";
import type { StorySummary } from "@/types/domain";
import { usePosts } from "@/lib/posts/posts-context";
import { CATEGORY_META } from "@/lib/category";
import { formatUpdatedAt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const TRENDING_WINDOW_MS = 24 * 60 * 60 * 1000;

export function MostDiscussed({ stories }: { stories: StorySummary[] }) {
  const { communityPosts } = usePosts();

  const top = useMemo(() => {
    // Same 24h window as StorySummary.recentPostCount — a story's rank
    // fades as engagement cools instead of an old burst of activity
    // keeping it pinned at the top forever.
    const localRecentCountBySlug = new Map<string, number>();
    for (const post of communityPosts) {
      if (!post.relatedStorySlug) continue;
      if (Date.now() - new Date(post.createdAt).getTime() > TRENDING_WINDOW_MS) continue;
      localRecentCountBySlug.set(
        post.relatedStorySlug,
        (localRecentCountBySlug.get(post.relatedStorySlug) ?? 0) + 1,
      );
    }

    return [...stories]
      .map((story) => ({
        story,
        recentPosts: story.recentPostCount + (localRecentCountBySlug.get(story.slug) ?? 0),
      }))
      .filter((s) => s.recentPosts > 0)
      .sort((a, b) => b.recentPosts - a.recentPosts)
      .slice(0, 3);
  }, [stories, communityPosts]);

  if (top.length === 0) return null;

  return (
    <section
      aria-label={t.story.trendingAria}
      className="flex flex-col gap-2 rounded-2xl p-2.5"
      style={{
        background: "color-mix(in oklch, var(--brand-gold) 7%, var(--card))",
        border: "1px solid color-mix(in oklch, var(--brand-gold) 35%, var(--border))",
      }}
    >
      <h2
        className="flex items-center gap-1.5 px-1 text-sm font-medium"
        style={{ color: "var(--brand-gold)" }}
      >
        <TrendingUp className="size-4" strokeWidth={1.75} />
        {t.story.trendingNow}
      </h2>
      <div className="flex flex-col gap-2">
        {top.map(({ story, recentPosts }) => {
          const meta = CATEGORY_META[story.category];
          const Icon = meta.icon;
          return (
            <Link
              key={story.id}
              href={`/story/${story.slug}`}
              className="flex items-center gap-3.5 rounded-xl p-4 transition-colors hover:bg-muted/60"
              style={{
                background: "color-mix(in oklch, var(--brand-gold) 4%, var(--card))",
                border: "1px solid color-mix(in oklch, var(--brand-gold) 22%, var(--border))",
              }}
            >
              {story.imageUrl ? (
                <div className="relative size-[92px] shrink-0 overflow-hidden rounded-lg bg-muted">
                  <Image src={story.imageUrl} alt="" fill sizes="92px" className="object-cover" />
                </div>
              ) : (
                <div
                  className={cn(
                    "flex size-[92px] shrink-0 items-center justify-center rounded-lg",
                    meta.bg,
                  )}
                >
                  <Icon className={cn("size-8", meta.text)} strokeWidth={1.75} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className={cn("text-xs font-medium", meta.text)}>{meta.label}</p>
                <p className="line-clamp-2 text-[15px] font-medium leading-snug text-foreground">
                  {story.title}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">{formatUpdatedAt(story.publishedAt)}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="size-3.5" strokeWidth={1.75} />
                {recentPosts}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
