interface PexelsPhoto {
  src: {
    large: string;
  };
}

interface PexelsSearchResponse {
  photos: PexelsPhoto[];
}

async function searchOnce(query: string, apiKey: string): Promise<string | null> {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: apiKey } });

  if (!res.ok) {
    console.error(`Pexels search error for "${query}": HTTP ${res.status}`);
    return null;
  }

  const data = (await res.json()) as PexelsSearchResponse;
  return data.photos[0]?.src.large ?? null;
}

/**
 * Best-effort — never throws. Tries the story title first (most specific),
 * then falls back to the category name if that comes up empty (a very
 * specific headline sometimes has no photo match; a category name almost
 * always does). Returns null if no key is set or both searches fail.
 */
export async function findStoryImage(title: string, category: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  try {
    const byTitle = await searchOnce(title, apiKey);
    if (byTitle) return byTitle;

    return await searchOnce(category, apiKey);
  } catch (err) {
    console.error("Error searching Pexels:", err instanceof Error ? err.message : String(err));
    return null;
  }
}
