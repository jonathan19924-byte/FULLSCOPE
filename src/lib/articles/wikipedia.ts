import { LOCALE } from "../locale";

interface Entities {
  people: string[];
  companies: string[];
  countries: string[];
}

export interface EntitySummary {
  entity: string;
  extract: string;
}

// Wikipedia's own site — matches the locale the rest of the pipeline
// already generates content in, so a lookup for a Hebrew-mode story hits
// Hebrew Wikipedia (real article titles in Hebrew) rather than English.
const WIKI_LANG = LOCALE === "he" ? "he" : "en";

// Capped so a story with many named entities doesn't turn into a long
// chain of lookups — people first (most likely to need identifying),
// then countries, then companies, same ordering reasoning as the plan:
// prioritize what a reader is most likely to be missing.
const MAX_ENTITIES_TO_CHECK = 3;

const REQUEST_HEADERS = {
  // Wikipedia's REST API asks callers to identify themselves; an
  // unidentified default fetch() UA can get throttled or blocked.
  "User-Agent": "FullScope/1.0 (news aggregator; contact via app)",
};

/** One entity's Wikipedia summary, or null if there's no confident match —
 * a missing/ambiguous page is the expected common case (many entity names
 * won't have an exact-title article), not an error. Never throws. */
async function fetchOneSummary(entity: string): Promise<EntitySummary | null> {
  try {
    const url = `https://${WIKI_LANG}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(entity)}`;
    const res = await fetch(url, { headers: REQUEST_HEADERS });
    if (!res.ok) return null;

    const data = (await res.json()) as { type?: string; extract?: string };
    // A disambiguation page means the name is ambiguous — using its
    // "extract" (a list of possible meanings) as story context would be
    // actively misleading, not helpful.
    if (data.type === "disambiguation" || !data.extract) return null;

    return { entity, extract: data.extract };
  } catch (err) {
    console.error(`Error fetching Wikipedia summary for "${entity}":`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Best-effort background context for a story's named entities — never
 * throws, returns an empty array if nothing qualifies (no entities, no
 * Wikipedia matches, or every lookup failed). Callers should treat an
 * empty result as the normal/common case, not a failure.
 */
export async function fetchEntityContext(entities: Entities): Promise<EntitySummary[]> {
  const candidates = [...entities.people, ...entities.countries, ...entities.companies].slice(
    0,
    MAX_ENTITIES_TO_CHECK,
  );
  if (candidates.length === 0) return [];

  const results = await Promise.all(candidates.map(fetchOneSummary));
  return results.filter((r): r is EntitySummary => r !== null);
}
