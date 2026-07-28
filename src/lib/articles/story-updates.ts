type UpdateType = "trend" | "merge";

/** Appends a "this story has developed" entry — called from trend-detection
 * (a reader trend changed the story's content) and process-articles' dedup
 * pass (a duplicate got merged into this one). Best-effort: a logging
 * failure should never break the actual pipeline operation that triggered
 * it, so this only logs its own errors rather than throwing.
 *
 * Untyped `supabase` param on purpose — this is called from two call sites
 * whose own Supabase clients are each constructed with slightly different
 * inferred generics, and story_updates is a backend-only table the same way
 * raw_articles is (see process-articles.ts's createProcessingClient), so
 * there's no value in fighting the generics just to type this one call. */
export async function logStoryUpdate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  params: { storyId: string; storySlug: string; updateType: UpdateType; summary: string },
): Promise<void> {
  const { error } = await supabase.from("story_updates").insert({
    story_id: params.storyId,
    story_slug: params.storySlug,
    update_type: params.updateType,
    summary: params.summary,
  });
  if (error) console.error("Error logging story update:", error.message);
}
