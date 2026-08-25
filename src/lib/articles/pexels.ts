import { callClaudeVision } from "./claude";

interface PexelsPhoto {
  src: {
    large: string;
  };
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[];
}

interface UnsplashPhoto {
  urls: {
    regular: string;
  };
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[];
}

const CANDIDATES_PER_SEARCH = 20;

async function searchManyPexels(query: string, apiKey: string): Promise<string[]> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${CANDIDATES_PER_SEARCH}&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: apiKey } });

  if (!res.ok) {
    console.error(`Pexels search error for "${query}": HTTP ${res.status}`);
    return [];
  }

  const data = (await res.json()) as PexelsSearchResponse;
  return data.photos.map((p) => p.src.large);
}

/** Second stock source, tried alongside Pexels for every query — same
 * free-to-use (Unsplash License) terms, just a different library, so a
 * query with a thin Pexels result set has a real second pool to draw from
 * instead of immediately falling back to an even more generic query. */
async function searchManyUnsplash(query: string, accessKey: string): Promise<string[]> {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${CANDIDATES_PER_SEARCH}&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${accessKey}` } });

  if (!res.ok) {
    console.error(`Unsplash search error for "${query}": HTTP ${res.status}`);
    return [];
  }

  const data = (await res.json()) as UnsplashSearchResponse;
  return data.results.map((p) => p.urls.regular);
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
 * Pulls from both stock sources for this one query before the caller moves
 * on to a different query — a thin result from one source shouldn't force
 * a whole new (and more generic) search when the other source might still
 * have a good, unused match for the same query.
 */
async function pickCleanCandidate(query: string, usedImageUrls: Set<string>): Promise<string | null> {
  const pexelsKey = process.env.PEXELS_API_KEY;
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

  const [pexelsCandidates, unsplashCandidates] = await Promise.all([
    pexelsKey ? searchManyPexels(query, pexelsKey) : Promise.resolve([]),
    unsplashKey ? searchManyUnsplash(query, unsplashKey) : Promise.resolve([]),
  ]);

  for (const candidate of [...pexelsCandidates, ...unsplashCandidates]) {
    if (usedImageUrls.has(candidate)) continue;
    if (await isImageClean(candidate)) return candidate;
  }

  return null;
}

/**
 * Best-effort — never throws. Tries each keyword phrase in order (most
 * specific first), then falls back to the category name if every phrase
 * comes up empty — a very specific headline sometimes has no photo match
 * across either source; a category name almost always does. Returns null
 * if neither stock source has a key configured, or everything fails.
 *
 * usedImageUrls is the set of image URLs already assigned to other live
 * stories — candidates already in that set are skipped so two different
 * stories don't end up with the same photo.
 */
export async function findStoryImage(
  keywordPhrases: string[],
  category: string,
  usedImageUrls: Set<string>,
): Promise<string | null> {
  if (!process.env.PEXELS_API_KEY && !process.env.UNSPLASH_ACCESS_KEY) return null;

  try {
    for (const phrase of keywordPhrases) {
      const found = await pickCleanCandidate(phrase, usedImageUrls);
      if (found) return found;
    }

    return await pickCleanCandidate(category, usedImageUrls);
  } catch (err) {
    console.error("Error searching for story image:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
