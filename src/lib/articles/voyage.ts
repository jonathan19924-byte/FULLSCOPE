const VOYAGE_MODEL = "voyage-3-lite";
export const EMBEDDING_DIMENSIONS = 512;

/**
 * Anthropic doesn't serve embeddings directly — Voyage AI is Anthropic's
 * recommended embeddings partner. voyage-3-lite is the cheap/fast tier,
 * appropriate here since this only powers an internal similarity search
 * over ~dozens of stories, not a user-facing search feature.
 */
export async function embedText(text: string): Promise<number[]> {
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
      input: [text],
      // "document" for text being stored/indexed, "query" for text used to
      // search against it — Voyage embeds each mode slightly differently to
      // improve retrieval quality. Callers pass the matching input type.
      input_type: "document",
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Voyage API error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as { data?: { embedding?: number[] }[] };
  const embedding = data.data?.[0]?.embedding;

  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Unexpected Voyage response shape (expected a ${EMBEDDING_DIMENSIONS}-dim embedding)`);
  }

  return embedding;
}

/** Same call, "query" input type — used for the related-story similarity
 * search, where the text being embedded is the new cluster (a search query
 * against already-embedded stories), not a document being stored. */
export async function embedQuery(text: string): Promise<number[]> {
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
      input: [text],
      input_type: "query",
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Voyage API error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const data = (await res.json()) as { data?: { embedding?: number[] }[] };
  const embedding = data.data?.[0]?.embedding;

  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Unexpected Voyage response shape (expected a ${EMBEDDING_DIMENSIONS}-dim embedding)`);
  }

  return embedding;
}

/** Formats an embedding vector as the literal pgvector expects when passed
 * through the Supabase JS client (a plain array gets serialized as a
 * Postgres array, not a vector — this string form is what pgvector's input
 * parser accepts). */
export function toPgVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
