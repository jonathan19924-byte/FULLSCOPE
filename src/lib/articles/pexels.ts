import { callClaudeVision } from "./claude";

interface PexelsPhoto {
  src: {
    large: string;
  };
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[];
}

const CANDIDATES_PER_SEARCH = 5;

async function searchMany(query: string, apiKey: string): Promise<string[]> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${CANDIDATES_PER_SEARCH}&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: apiKey } });

  if (!res.ok) {
    console.error(`Pexels search error for "${query}": HTTP ${res.status}`);
    return [];
  }

  const data = (await res.json()) as PexelsSearchResponse;
  return data.photos.map((p) => p.src.large);
}

const VISION_QUESTION =
  "Does this photograph contain a legible sign, banner, placard, or other readable text/writing " +
  "(for example a protest sign, a printed slogan, a storefront sign with a message, graffiti with words)? " +
  "Answer with exactly one word: yes or no.";

/**
 * Downloads a candidate photo and asks Claude directly whether it contains
 * legible text/signage — a real content check, not a keyword match against
 * the stock library's own (possibly incomplete or differently-worded)
 * description. Motivated by a production case where a photo carried a
 * banner reading "Trump, Netanyahu = war criminals" on a contested story:
 * the image itself was taking a side regardless of how Pexels described it.
 * Fails "clean" (true) on any error — a photo we couldn't check shouldn't
 * block story generation entirely; the alternative (no photo at all) isn't
 * safer.
 */
async function isImageClean(imageUrl: string): Promise<boolean> {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return true;

    const mediaType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const answer = await callClaudeVision(base64, mediaType, VISION_QUESTION, 10);
    return !answer.trim().toLowerCase().startsWith("yes");
  } catch (err) {
    console.error("Error checking image for legible text:", err instanceof Error ? err.message : String(err));
    return true;
  }
}

/**
 * Picks the first candidate that's both unused (checked for free, no API
 * call) and clean of legible text/signage (checked via vision, one photo at
 * a time — only escalates to the next candidate if the current one fails
 * one of those checks, so the common case costs at most one vision call).
 */
async function pickCleanCandidate(query: string, apiKey: string, usedImageUrls: Set<string>): Promise<string | null> {
  const candidates = await searchMany(query, apiKey);

  for (const candidate of candidates) {
    if (usedImageUrls.has(candidate)) continue;
    if (await isImageClean(candidate)) return candidate;
  }

  return null;
}

/**
 * Best-effort — never throws. Tries the story title first (most specific),
 * then falls back to the category name if that comes up empty (a very
 * specific headline sometimes has no photo match; a category name almost
 * always does). Returns null if no key is set or both searches fail.
 *
 * usedImageUrls is the set of image URLs already assigned to other live
 * stories — candidates already in that set are skipped so two different
 * stories don't end up with the same photo.
 */
export async function findStoryImage(
  title: string,
  category: string,
  usedImageUrls: Set<string>,
): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  try {
    const byTitle = await pickCleanCandidate(title, apiKey, usedImageUrls);
    if (byTitle) return byTitle;

    return await pickCleanCandidate(category, apiKey, usedImageUrls);
  } catch (err) {
    console.error("Error searching Pexels:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
