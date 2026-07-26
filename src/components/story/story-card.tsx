import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import type { StorySummary } from "@/types/domain";
import { CATEGORY_META } from "@/lib/category";
import { formatUpdatedAt, formatReadingTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BookmarkButton } from "@/components/shared/bookmark-button";
import { PerspectiveBar } from "@/components/story/perspective-bar";

interface StoryCardProps {
  story: StorySummary;
  variant?: "featured" | "standard" | "compact";
  className?: string;
}

export function StoryCard({ story, variant = "standard", className }: StoryCardProps) {
  const meta = CATEGORY_META[story.category];
  const Icon = meta.icon;

  if (variant === "compact") {
    return (
      <Link
        href={`/story/${story.slug}`}
        className={cn(
          "flex items-center gap-3 rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/60",
          className,
        )}
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
          <p className={cn("text-xs font-medium", meta.text)}>{story.category}</p>
          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
            {story.title}
          </p>
        </div>
      </Link>
    );
  }

  const isFeatured = variant === "featured";

  return (
    <Link
      href={`/story/${story.slug}`}
      className={cn(
        "group/story-card relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        isFeatured ? "border-border" : "border-border/60 hover:border-border",
        className,
      )}
    >
      <div className={cn("h-[3px] w-full shrink-0", meta.accent)} aria-hidden />

      <div
        className={cn(
          "relative flex aspect-[16/10] items-center justify-center overflow-hidden bg-gradient-to-br",
          meta.gradient,
        )}
      >
        {story.imageUrl ? (
          <Image
            src={story.imageUrl}
            alt=""
            fill
            sizes={isFeatured ? "100vw" : "(min-width: 640px) 50vw, 100vw"}
            className="object-cover"
            priority={isFeatured}
          />
        ) : (
          <Icon
            className={cn(meta.text, isFeatured ? "size-12" : "size-8")}
            strokeWidth={1.25}
          />
        )}
        <div className="absolute end-2.5 top-2.5">
          <BookmarkButton slug={story.slug} title={story.title} />
        </div>
        <div className="absolute start-3 top-2.5 flex items-center gap-1.5">
          <span
            className={cn(
              "rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium backdrop-blur-sm",
              meta.text,
            )}
          >
            {story.category}
          </span>
          {isFeatured && (
            <span className="rounded-full bg-foreground/90 px-2.5 py-1 text-xs font-medium text-background backdrop-blur-sm">
              Top Story
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3
          className={cn(
            "font-serif leading-snug text-foreground",
            isFeatured ? "text-xl font-semibold line-clamp-3" : "text-base font-semibold line-clamp-2",
          )}
        >
          {story.title}
        </h3>
        <p
          className={cn(
            "text-sm leading-relaxed text-muted-foreground",
            isFeatured ? "line-clamp-3" : "line-clamp-2",
          )}
        >
          {story.summary}
        </p>
        <PerspectiveBar perspectiveA={story.perspectiveA} perspectiveB={story.perspectiveB} />
        <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-muted-foreground">
          <span>{formatUpdatedAt(story.publishedAt)}</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" strokeWidth={1.75} />
            {formatReadingTime(story.readingTimeMinutes)}
          </span>
        </div>
      </div>
    </Link>
  );
}
