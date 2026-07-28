import type { StorySummary } from "@/types/domain";
import { StoryCard } from "@/components/story/story-card";
import { t } from "@/lib/i18n";

export function RelatedStories({ stories }: { stories: StorySummary[] }) {
  if (stories.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" className="flex flex-col gap-3">
      <h2 id="related-heading" className="font-serif text-lg font-semibold text-foreground">
        {t.story.relatedStories}
      </h2>
      <div className="flex flex-col gap-2.5">
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} variant="compact" />
        ))}
      </div>
    </section>
  );
}
