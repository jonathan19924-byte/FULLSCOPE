const VOYAGE_MODEL = "voyage-3-lite";
export const EMBEDDING_DIMENSIONS = 512;

/** Voyage caps batch requests at 128 inputs, but the free tier's 10K
 * tokens/minute limit (no payment method on file) bites first — a 128-story
 * batch of Hebrew title+summary text hit that in one call. No official
 * tokenizer is used here (would mean pulling in a real tokenizer dependency
 * just for this); this is a deliberately conservative char-count proxy
 * instead — assumes roughly 1 token per 2 characters, which overestimates
 * true token count for most text and so stays safely under budget rather
 * than cutting it close. */
const MAX_BATCH_CHARS = 6000;
const MAX_BATCH_SIZE = 128;

/** Free-tier accounts (no payment method) are also capped at 3
 * requests/minute — spacing consecutive batch calls out avoids tripping
 * that when a backfill needs more than one call. Only applies between
 * chunks within a single embedTexts call; embedText/embedQuery (one text,
 * one call) never hit this path since the live pipeline's calls are
 * already naturally spread out over a run. */
const BATCH_CALL_SPACING_MS = 21_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callVoyageEmbeddings(texts: string[], inputType: "document" | "query"): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VOYAGE_API_KEY — set it in .env.local (see .env.local.example).");
  }

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: VOYAGE_MODEL,
      input: texts,
      // "document" for text being stored/indexed, "query" for text used to
      // search against it — Voyage embeds each mode slightly differently to
      // improve retrieval quality. Callers pass the matching input type.
      input_type: inputType,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Voyage API error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as { data?: { embedding?: number[] }[] };
  const embeddings = data.data?.map((d) => d.embedding);

  if (
    !Array.isArray(embeddings) ||
    embeddings.length !== texts.length ||
    embeddings.some((e) => !Array.isArray(e) || e.length !== EMBEDDING_DIMENSIONS)
  ) {
    throw new Error(`Unexpected Voyage response shape (expected ${texts.length} ${EMBEDDING_DIMENSIONS}-dim embeddings)`);
  }

  return embeddings as number[][];
}

/**
 * Anthropic doesn't serve embeddings directly — Voyage AI is Anthropic's
 * recommended embeddings partner. voyage-3-lite is the cheap/fast tier,
 * appropriate here since this only powers an internal similarity search
 * over ~dozens of stories, not a user-facing search feature.
 */
export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await callVoyageEmbeddings([text], "document");
  return embedding;
}

/** Batch variant of embedText — one Voyage API call for up to
 * MAX_BATCH_SIZE texts at once, chunking transparently above that. Exists
 * specifically for the one-off story-embedding backfill script, where
 * embedding hundreds of existing stories one API call at a time would blow
 * through Voyage's free-tier rate limit (3 requests/minute without a
 * payment method on file) — batching turns hundreds of calls into a
 * handful. The live pipeline's per-story/per-cluster paths (embedText/
 * embedQuery) don't need this: they're already naturally spread out over a
 * run's runtime. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const chunks: string[][] = [];
  let current: string[] = [];
  let currentChars = 0;

  for (const text of texts) {
    const wouldExceed = current.length >= MAX_BATCH_SIZE || currentChars + text.length > MAX_BATCH_CHARS;
    if (wouldExceed && current.length > 0) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(text);
    currentChars += text.length;
  }
  if (current.length > 0) chunks.push(current);

  const results: number[][] = [];
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await sleep(BATCH_CALL_SPACING_MS);
    const embeddings = await callVoyageEmbeddings(chunks[i], "document");
    results.push(...embeddings);
  }
  return results;
}

/** Same call, "query" input type — used for the related-story similarity
 * search, where the text being embedded is the new cluster (a search query
 * against already-embedded stories), not a document being stored. */
export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await callVoyageEmbeddings([text], "query");
  return embedding;
}

/** Formats an embedding vector as the literal pgvector expects when passed
 * through the Supabase JS client (a plain array gets serialized as a
 * Postgres array, not a vector — this string form is what pgvector's input
 * parser accepts). */
export function toPgVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
