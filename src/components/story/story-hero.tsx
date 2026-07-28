import { Clock } from "lucide-react";
import type { Story } from "@/types/domain";
import { CATEGORY_META } from "@/lib/category";
import { formatUpdatedAt, formatReadingTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BookmarkButton } from "@/components/shared/bookmark-button";
import { ShareButton } from "@/components/shared/share-button";
import { t } from "@/lib/i18n";

export function StoryHero({ story }: { story: Story }) {
  const meta = CATEGORY_META[story.category];
  const Icon = meta.icon;

  return (
    <header className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl">
        <div className={cn("h-[3px] w-full", meta.accent)} aria-hidden />
        <div
          className={cn(
            "relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br sm:h-44",
            meta.gradient,
          )}
          role="img"
          aria-label={t.story.storyAria(meta.label)}
        >
          <Icon className={cn("size-14", meta.text)} strokeWidth={1.25} />
          <span
            className={cn(
              "absolute start-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-xs font-medium backdrop-blur-sm",
              meta.text,
            )}
          >
            {meta.label}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="font-serif text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
          {story.title}
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          {story.summary}
        </p>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatUpdatedAt(story.publishedAt)}</span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" strokeWidth={1.75} />
              {formatReadingTime(story.readingTimeMinutes)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <BookmarkButton slug={story.slug} title={story.title} />
            <ShareButton title={story.title} text={story.summary} path={`/story/${story.slug}`} />
          </div>
        </div>
      </div>
    </header>
  );
}
