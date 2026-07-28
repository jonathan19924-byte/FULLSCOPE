import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoryBySlug, getRelatedStories, toSummary } from "@/lib/services/story-service";
import { StoryHero } from "@/components/story/story-hero";
import { ReadingProgress } from "@/components/story/reading-progress";
import { WhatHappened } from "@/components/story/what-happened";
import { Timeline } from "@/components/story/timeline";
import { Perspectives } from "@/components/story/perspectives";
import { PerspectiveBar } from "@/components/story/perspective-bar";
import { KeyDifferences } from "@/components/story/key-differences";
import { StoryUpdates } from "@/components/story/story-updates";
import { getStoryUpdates } from "@/lib/services/get-story-updates";
import { ReactionsFeed } from "@/components/story/reactions-feed";
import { CommunityPosts } from "@/components/story/community-posts";
import { SourcesList } from "@/components/story/sources-list";
import { RelatedStories } from "@/components/story/related-stories";
import { Separator } from "@/components/ui/separator";
import { t } from "@/lib/i18n";

/** This route always renders dynamically anyway (the root layout reads
 * cookies() for the auth check on every request). generateStaticParams was
 * removed entirely — pairing it with an empty array (e.g. Hebrew mode, where
 * seed-stories.json is gated off) still made Next.js 16 attempt a static
 * fallback shell for unlisted params, which hit that cookies() call with no
 * request scope, threw DYNAMIC_SERVER_USAGE, and got silently swallowed by
 * getStoryBySlug's error handling as "story not found" — intermittently
 * breaking real stories in production. Dropping generateStaticParams so this
 * route has no static-generation machinery at all avoids that path entirely. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) return { title: t.story.notFound };
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
  const updates = await getStoryUpdates(story.id);
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
      <StoryUpdates updates={updates} />
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
