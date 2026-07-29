import { TrendingUp, GitMerge, Newspaper } from "lucide-react";
import type { StoryUpdate } from "@/lib/services/get-story-updates";
import { formatUpdatedAt } from "@/lib/format";
import { t } from "@/lib/i18n";

export function StoryUpdates({ updates }: { updates: StoryUpdate[] }) {
  if (updates.length === 0) return null;

  return (
    <section aria-labelledby="story-updates-heading" className="flex flex-col gap-3">
      <h2 id="story-updates-heading" className="font-serif text-lg font-semibold text-foreground">
        {t.story.howThisDeveloped}
      </h2>
      <ol className="flex flex-col gap-3">
        {updates.map((update) => {
          const Icon =
            update.updateType === "trend" ? TrendingUp : update.updateType === "merge" ? GitMerge : Newspaper;
          const prefix =
            update.updateType === "trend"
              ? t.story.updateTrendPrefix
              : update.updateType === "merge"
                ? t.story.updateMergePrefix
                : t.story.updateCoveragePrefix;
          return (
            <li key={update.id} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
              </span>
              <div className="flex flex-col gap-0.5 pt-0.5">
                <p className="text-sm leading-relaxed text-foreground/90">
                  <span className="font-medium text-foreground">{prefix}</span>
                  {update.summary}
                </p>
                <span className="text-xs text-muted-foreground">{formatUpdatedAt(update.createdAt)}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
