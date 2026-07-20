import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllStories } from "@/lib/repositories/story-repository";
import { getStoryBySlug, getRelatedStories } from "@/lib/services/story-service";
import { StoryHero } from "@/components/story/story-hero";
import { WhatHappened } from "@/components/story/what-happened";
import { VerifiedFacts } from "@/components/story/verified-facts";
import { Timeline } from "@/components/story/timeline";
import { Perspectives } from "@/components/story/perspectives";
import { KeyDifferences } from "@/components/story/key-differences";
import { ReactionsFeed } from "@/components/story/reactions-feed";
import { SourcesList } from "@/components/story/sources-list";
import { RelatedStories } from "@/components/story/related-stories";
import { Separator } from "@/components/ui/separator";

export async function generateStaticParams() {
  const stories = await getAllStories();
  return stories.map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) return { title: "Story not found" };
  return {
    title: story.title,
    description: story.summary,
  };
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);

  if (!story) notFound();

  const related = await getRelatedStories(story);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 pt-6 pb-10">
      <StoryHero story={story} />
      <Separator />
      <WhatHappened text={story.whatHappened} />
      <VerifiedFacts facts={story.timeline} />
      <Timeline facts={story.timeline} />
      <Perspectives perspectiveA={story.perspectiveA} perspectiveB={story.perspectiveB} />
      <KeyDifferences cause={story.keyDifferencesCause} impact={story.keyDifferencesImpact} />
      <ReactionsFeed
        posts={story.posts}
        perspectiveAName={story.perspectiveA.name}
        perspectiveBName={story.perspectiveB.name}
      />
      <SourcesList sources={story.sources} />
      <Separator />
      <RelatedStories stories={related} />
    </div>
  );
}
