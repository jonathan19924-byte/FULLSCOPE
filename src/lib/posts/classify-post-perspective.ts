"use server";

import { getStoryBySlug } from "@/lib/services/story-service";
import { callClaude, parseClaudeJson } from "@/lib/articles/claude";

export type ClassifyPerspectiveResult =
  | { perspective: "A" | "B" }
  | { uncertain: true; perspectiveATitle: string; perspectiveBTitle: string };

function buildClassifyPrompt(
  content: string,
  perspectiveA: { name: string; summary: string; claims: string[] },
  perspectiveB: { name: string; summary: string; claims: string[] },
): string {
  return `A reader wrote this post reacting to a news story:
"${content}"

The story presents two perspectives:

Perspective A "${perspectiveA.name}": ${perspectiveA.summary}
Claims: ${perspectiveA.claims.join(" | ")}

Perspective B "${perspectiveB.name}": ${perspectiveB.summary}
Claims: ${perspectiveB.claims.join(" | ")}

Decide which perspective this reader's post leans toward, if any. Only pick "A" or "B" if it's clearly one or the other — if the post is neutral, acknowledges both sides, is off-topic, or you're not confident, say "unclear".

Do not explain your reasoning. Respond with nothing but the JSON object itself, no other text before or after it:
{"leaning": "A"}
or
{"leaning": "B"}
or
{"leaning": "unclear"}`;
}

/** Classifies which side of a story's two perspectives a real reader post
 * leans toward, run once at post-creation time (not on every keystroke) —
 * see CreatePostForm. Mirrors detect-related-story.ts's retrieval-then-judge
 * shape but doesn't need the retrieval step since the story is already
 * known by the time this runs. Fails open: any error just means "couldn't
 * classify," which the caller treats the same as an unclear result. */
export async function classifyPostPerspective(
  content: string,
  storySlug: string,
): Promise<ClassifyPerspectiveResult | null> {
  try {
    const story = await getStoryBySlug(storySlug);
    if (!story) return null;

    const raw = await callClaude(buildClassifyPrompt(content, story.perspectiveA, story.perspectiveB), 200);
    const parsed = parseClaudeJson<{ leaning: "A" | "B" | "unclear" }>(raw);

    if (parsed.leaning === "A" || parsed.leaning === "B") {
      return { perspective: parsed.leaning };
    }

    return {
      uncertain: true,
      perspectiveATitle: story.perspectiveA.name,
      perspectiveBTitle: story.perspectiveB.name,
    };
  } catch {
    return null;
  }
}
