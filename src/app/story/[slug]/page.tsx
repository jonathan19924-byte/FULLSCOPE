import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSeedStorySlugs } from "@/lib/repositories/story-repository";
import { getStoryBySlug, getRelatedStories, toSummary } from "@/lib/services/story-service";
import { StoryHero } from "@/components/story/story-hero";
import { ReadingProgress } from "@/components/story/reading-progress";
import { WhatHappened } from "@/components/story/what-happened";
import { Timeline } from "@/components/story/timeline";
import { Perspectives } from "@/components/story/perspectives";
import { PerspectiveBar } from "@/components/story/perspective-bar";
import { KeyDifferences } from "@/components/story/key-differences";
import { ReactionsFeed } from "@/components/story/reactions-feed";
import { CommunityPosts } from "@/components/story/community-posts";
import { SourcesList } from "@/components/story/sources-list";
import { RelatedStories } from "@/components/story/related-stories";
import { Separator } from "@/components/ui/separator";

export function generateStaticParams() {
  return getSeedStorySlugs().map((slug) => ({ slug }));
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
  const summary = toSummary(story);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 pt-6 pb-10">
      <ReadingProgress />
      <StoryHero story={story} />
      <Separator />
      <WhatHappened text={story.whatHappened} />
      <Timeline facts={story.timeline} />
      <PerspectiveBar perspectiveA={summary.perspectiveA} perspectiveB={summary.perspectiveB} />
      <Perspectives perspectiveA={story.perspectiveA} perspectiveB={story.perspectiveB} />
      <KeyDifferences cause={story.keyDifferencesCause} impact={story.keyDifferencesImpact} />
      <ReactionsFeed
        posts={story.posts}
        perspectiveAName={story.perspectiveA.name}
        perspectiveBName={story.perspectiveB.name}
        storySlug={story.slug}
      />
      <CommunityPosts storySlug={story.slug} />
      <SourcesList sources={story.sources} />
      <Separator />
      <RelatedStories stories={related} />
    </div>
  );
}
