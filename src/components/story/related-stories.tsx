import type { StorySummary } from "@/types/domain";
import { StoryCard } from "@/components/story/story-card";

export function RelatedStories({ stories }: { stories: StorySummary[] }) {
  if (stories.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" className="flex flex-col gap-3">
      <h2 id="related-heading" className="font-serif text-lg font-semibold text-foreground">
        Related stories
      </h2>
      <div className="flex flex-col gap-2.5">
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} variant="compact" />
        ))}
      </div>
    </section>
  );
}
