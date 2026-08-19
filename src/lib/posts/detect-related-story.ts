"use server";

import { createClient } from "@/lib/supabase/server";
import { embedQuery, toPgVectorLiteral } from "@/lib/articles/voyage";
import { callClaude, parseClaudeJson } from "@/lib/articles/claude";
import type { Category } from "@/types/domain";

const CANDIDATE_COUNT = 4;
const MIN_CONTENT_LENGTH = 15;

interface StoryCandidate {
  slug: string;
  title: string;
  summary: string;
}

function buildDetectPrompt(content: string, candidates: StoryCandidate[]): string {
  const candidateList = candidates.map((c, i) => `${i}. ${c.title} — ${c.summary}`).join("\n");
  return `A reader wrote this post on a news app:
"${content}"

Below are news stories currently on the app that might be what this post is about:
${candidateList}

Decide: is this post CLEARLY about one specific story from the list above, not just a loosely related topic? Only match if you're confident — when in doubt, don't match.

Do not explain your reasoning. Respond with nothing but the JSON object itself, no other text before or after it:
{"story_index": 0}
or
{"story_index": null}`;
}

/** Detects whether a standalone post is actually about a specific story, so
 * the composer can offer to link it instead of forcing the user to manually
 * browse every story in a dropdown (the old UX). Embedding retrieval
 * narrows to a handful of candidates, then a quick Claude call judges
 * whether any is a genuine match — embeddings alone are noisy for short
 * (280-char) post text, so this mirrors the same retrieval-then-judge
 * pattern process-articles.ts already uses for related-story detection in
 * the content pipeline, just applied to one post instead of a cluster of
 * articles. Fails open (returns null) on any error, and skips very short
 * posts entirely — this is a best-effort suggestion, never something that
 * should block or slow down posting. */
export async function detectRelatedStory(
  content: string,
): Promise<{ slug: string; title: string; category: Category } | null> {
  if (content.trim().length < MIN_CONTENT_LENGTH) return null;

  try {
    const supabase = await createClient();
    const embedding = await embedQuery(content);
    // match_stories isn't in the generated Database["public"]["Functions"]
    // map (empty — no RPCs are typed there), same reason process-articles.ts
    // casts its own result rather than fighting the types here.
    const rpc = supabase.rpc.bind(supabase) as unknown as (
      fn: string,
      args: unknown,
    ) => Promise<{ data: unknown; error: unknown }>;
    const { data, error } = await rpc("match_stories", {
      query_embedding: toPgVectorLiteral(embedding),
      match_count: CANDIDATE_COUNT,
    });
    if (error) throw error;

    const candidates = (data ?? []) as StoryCandidate[];
    if (candidates.length === 0) return null;

    const raw = await callClaude(buildDetectPrompt(content, candidates), 300);
    const parsed = parseClaudeJson<{ story_index: number | null }>(raw);
    if (parsed.story_index === null || parsed.story_index === undefined) return null;

    const match = candidates[parsed.story_index];
    if (!match) return null;

    const { data: storyRow } = await supabase.from("stories").select("category").eq("slug", match.slug).maybeSingle();
    if (!storyRow) return null;

    return { slug: match.slug, title: match.title, category: storyRow.category as Category };
  } catch {
    return null;
  }
}
