import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";
import { LOCALE } from "../locale";

/**
 * Untyped on purpose: raw_articles isn't part of src/lib/supabase/database.types.ts
 * (that file mirrors the app-facing schema; this is a separate backend-only
 * ingestion table with its own row shape below).
 */
function createRawArticlesClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — set them in .env.local (see .env.local.example).",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type SourceLean =
  | "centre"
  | "left"
  | "right"
  | "international"
  | "technology"
  | "science"
  | "middle_east";

export interface FeedConfig {
  name: string;
  url: string;
  lean: SourceLean;
}

export const FEEDS: FeedConfig[] = [
  // centre
  { name: "PBS NewsHour", url: "https://www.pbs.org/newshour/feeds/rss/headlines", lean: "centre" },
  { name: "CBS News", url: "https://www.cbsnews.com/latest/rss/main", lean: "centre" },
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", lean: "centre" },
  { name: "ABC News", url: "https://abcnews.go.com/abcnews/topstories", lean: "centre" },
  // Google's own feed terms restrict this to "personal, non-commercial"
  // reader use — included at the user's explicit request despite that.
  { name: "Google News", url: "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en", lean: "centre" },
  // left
  { name: "NPR", url: "https://feeds.npr.org/1001/rss.xml", lean: "left" },
  { name: "The Guardian", url: "https://www.theguardian.com/us/rss", lean: "left" },
  { name: "Democracy Now", url: "https://www.democracynow.org/democracynow.rss", lean: "left" },
  { name: "Vox", url: "https://www.vox.com/rss/index.xml", lean: "left" },
  { name: "The Intercept", url: "https://theintercept.com/feed/?lang=en", lean: "left" },
  { name: "Mother Jones", url: "https://www.motherjones.com/feed/", lean: "left" },
  // right
  { name: "Fox News", url: "https://moxie.foxnews.com/feedburner/latest.xml", lean: "right" },
  { name: "The Daily Wire", url: "https://www.dailywire.com/feeds/rss.xml", lean: "right" },
  { name: "New York Post", url: "https://nypost.com/feed/", lean: "right" },
  { name: "National Review", url: "https://www.nationalreview.com/feed/", lean: "right" },
  { name: "Washington Examiner", url: "https://www.washingtonexaminer.com/tag/news.rss", lean: "right" },
  { name: "The Federalist", url: "https://thefederalist.com/feed/", lean: "right" },
  // international
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", lean: "international" },
  { name: "France 24", url: "https://www.france24.com/en/rss", lean: "international" },
  { name: "Deutsche Welle", url: "https://rss.dw.com/rdf/rss-en-all", lean: "international" },
  { name: "The Japan Times", url: "https://www.japantimes.co.jp/feed/", lean: "international" },
  { name: "UN News", url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml", lean: "international" },
  // technology
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", lean: "technology" },
  { name: "Wired", url: "https://www.wired.com/feed/rss", lean: "technology" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", lean: "technology" },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", lean: "technology" },
  // science
  { name: "Science Daily", url: "https://www.sciencedaily.com/rss/all.xml", lean: "science" },
  { name: "NASA", url: "https://www.nasa.gov/news-release/feed/", lean: "science" },
  { name: "Space.com", url: "https://www.space.com/feeds/all", lean: "science" },
  // middle_east
  { name: "Times of Israel", url: "https://www.timesofisrael.com/feed/", lean: "middle_east" },
  { name: "Jerusalem Post", url: "https://www.jpost.com/rss/rssfeedsfrontpage.aspx", lean: "middle_east" },
  { name: "Al-Monitor", url: "https://www.al-monitor.com/rss", lean: "middle_east" },
];

/**
 * Hebrew/Israeli source set for the NEXT_PUBLIC_LOCALE=he pivot (see
 * src/lib/locale.ts). All 36 user-supplied sources were live-tested; 35 are
 * genuinely Hebrew (confirmed by decoding real article titles) — Arab48 was
 * dropped at the user's request since it's Arabic, not Hebrew. `lean` here
 * is a rough approximation (Israeli politics don't reduce to a US-style
 * left/right axis) — kept only for source metadata, not for how
 * process-articles.ts frames each story's two perspectives.
 */
/**
 * Curated down from a larger list on 2026-07-31 — see CONTENT_PIPELINE.md
 * for the full reasoning. Two changes worth noting explicitly: Cursorinfo
 * was dropped for publishing in Russian (not Hebrew), which actively hurt
 * clustering quality, not just added volume noise. And the left/right split
 * was originally kept at 4-and-4 (Davar/Local Call/Kol Ha'ir/Shakuf vs.
 * Israel National News/Srugim/Kipa/Israel Defense) rather than trimming
 * left-leaning sources down to one — Srugim and Kipa alone are the two
 * highest-volume sources in the whole list, so cutting left-leaning
 * coverage down further while keeping those would have skewed the input
 * pool itself before any generation happens, which matters for an app
 * whose whole premise is genuine two-sided coverage.
 *
 * Five sources removed 2026-08-02 (Times of Israel, Now 14, Kol Ha'ir,
 * Israel Defense, Geektime) after confirming — via a real diagnostic
 * GitHub Actions run, not guessing — that all five are permanently blocked
 * by Cloudflare's bot-challenge system on GitHub Actions' IP range
 * specifically (every response came back `cf-mitigated: challenge` with an
 * actual CAPTCHA/"Just a moment..." interstitial page, identical whether
 * requested with the bot's own User-Agent or a real browser one — proving
 * this isn't a header issue and can't be fixed without paid proxy
 * infrastructure). These five had been contributing zero articles every
 * run since the 2026-07-31 curation regardless. Removing Kol Ha'ir (left)
 * and Israel Defense (right) together happens to preserve the left/right
 * balance at 3-and-3 rather than requiring a separate rebalancing decision.
 * Geektime was the only "technology" category source — its removal means
 * this list currently has no working technology-category source at all;
 * worth deciding later whether that category needs a replacement or should
 * be dropped from the taxonomy for Hebrew mode.
 */
export const HEBREW_FEEDS: FeedConfig[] = [
  // centre / mainstream
  { name: "Ynet", url: "https://www.ynet.co.il/Integration/StoryRss2.xml", lean: "centre" },
  { name: "Walla News", url: "https://rss.walla.co.il/feed/1?type=main", lean: "centre" },
  { name: "Mako / N12", url: "https://rcs.mako.co.il/rss/news-military.xml", lean: "centre" },
  { name: "Maariv", url: "https://www.maariv.co.il/rss/rssfeeds.aspx", lean: "centre" },
  { name: "Israel Hayom", url: "https://www.israelhayom.com/feed/", lean: "centre" },
  { name: "The Jerusalem Post", url: "https://www.jpost.com/rss/rssallnews", lean: "centre" },
  // left / progressive
  { name: "Davar", url: "https://www.davar1.co.il/feed/", lean: "left" },
  { name: "Local Call", url: "https://www.mekomit.co.il/feed/", lean: "left" },
  { name: "Shakuf", url: "https://shakuf.co.il/feed/", lean: "left" },
  // right / religious-nationalist
  { name: "Israel National News", url: "https://www.inn.co.il/Rss.aspx", lean: "right" },
  { name: "Srugim", url: "https://www.srugim.co.il/feed", lean: "right" },
  { name: "Kipa", url: "https://www.kipa.co.il/feed/", lean: "right" },
  { name: "Kore", url: "https://www.kore.co.il/rss", lean: "right" },
  // business
  { name: "Globes", url: "https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=2", lean: "centre" },
];

export const ACTIVE_FEEDS: FeedConfig[] = LOCALE === "he" ? HEBREW_FEEDS : FEEDS;

interface RawArticleRow {
  source_name: string;
  source_lean: SourceLean;
  title: string;
  description: string | null;
  url: string;
  published_at: string | null;
}

export interface FeedFetchResult {
  name: string;
  saved: number;
  error?: string;
}

export interface FetchAllFeedsResult {
  results: FeedFetchResult[];
  totalSaved: number;
}

const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

/** RSS 2.0 fields are usually plain strings; Atom fields and CDATA-wrapped
 * values sometimes come through as { "#text": "..." } — this normalizes both. */
function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)["#text"] ?? "");
  }
  return "";
}

function linkOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    // Atom feeds can have multiple <link> entries; prefer rel="alternate" or the first with an href.
    const alt = value.find(
      (v) => typeof v === "object" && v !== null && ((v as Record<string, unknown>)["@_rel"] ?? "alternate") === "alternate",
    );
    return linkOf(alt ?? value[0]);
  }
  if (typeof value === "object") {
    const href = (value as Record<string, unknown>)["@_href"];
    if (typeof href === "string") return href;
    return textOf(value);
  }
  return "";
}

function stripHtml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePublishedAt(item: Record<string, unknown>): string | null {
  const raw = item.pubDate ?? item.published ?? item.updated ?? item.date ?? item["dc:date"];
  const text = textOf(raw);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extractItems(parsed: Record<string, unknown>): Record<string, unknown>[] {
  const rss = parsed.rss as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  const rssItems = channel?.item;
  if (rssItems) {
    return Array.isArray(rssItems) ? (rssItems as Record<string, unknown>[]) : [rssItems as Record<string, unknown>];
  }

  const feed = parsed.feed as Record<string, unknown> | undefined;
  const atomEntries = feed?.entry;
  if (atomEntries) {
    return Array.isArray(atomEntries) ? (atomEntries as Record<string, unknown>[]) : [atomEntries as Record<string, unknown>];
  }

  // RSS 1.0 / RDF (e.g. Deutsche Welle): <item> elements are siblings of
  // <channel> directly under <rdf:RDF>, not nested inside channel.
  const rdf = parsed["rdf:RDF"] as Record<string, unknown> | undefined;
  const rdfItems = rdf?.item;
  if (rdfItems) {
    return Array.isArray(rdfItems) ? (rdfItems as Record<string, unknown>[]) : [rdfItems as Record<string, unknown>];
  }

  return [];
}

/** One retry after a short pause for a rare, unexplained transient failure
 * (observed as "JWT issued at future" from Node's fetch/undici — ruled out
 * clock skew via a real diagnostic GitHub Actions run, so treating it as a
 * one-off network/TLS blip rather than something to root-cause further; in
 * 5 repeated attempts against the same sources that had shown it, it never
 * reproduced once, suggesting a simple retry absorbs it). Does not retry a
 * real HTTP error response (e.g. the permanently-blocked-by-Cloudflare
 * sources' 403s) — those fail the same way every time, so a retry there
 * would just double the wasted request for no benefit. */
async function fetchWithOneRetry(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return fetch(url, init);
  }
}

async function fetchFeedArticles(feed: FeedConfig): Promise<RawArticleRow[]> {
  const res = await fetchWithOneRetry(feed.url, {
    headers: {
      "User-Agent": "FullScopeRSSBot/1.0 (+https://fullscope-eight.vercel.app)",
      Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  const parsed = xmlParser.parse(xml) as Record<string, unknown>;
  const items = extractItems(parsed);

  const rows: RawArticleRow[] = [];
  for (const item of items) {
    const title = stripHtml(textOf(item.title));
    const url = linkOf(item.link);
    if (!title || !url) continue;

    const descriptionRaw = textOf(item.description) || textOf(item.summary) || textOf(item["content:encoded"]);

    rows.push({
      source_name: feed.name,
      source_lean: feed.lean,
      title,
      description: descriptionRaw ? stripHtml(descriptionRaw) : null,
      url,
      published_at: parsePublishedAt(item),
    });
  }

  return rows;
}

/** Supabase errors are plain objects with a `.message` (not real Error
 * instances), so `instanceof Error` misses them and they'd otherwise log as
 * the unhelpful "[object Object]". */
function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

async function processFeed(
  feed: FeedConfig,
  supabase: ReturnType<typeof createRawArticlesClient>,
): Promise<FeedFetchResult> {
  console.log(`Fetching ${feed.name}...`);

  try {
    const articles = await fetchFeedArticles(feed);

    if (articles.length === 0) {
      console.log(`Saved 0 new articles from ${feed.name}`);
      return { name: feed.name, saved: 0 };
    }

    const { data, error } = await supabase
      .from("raw_articles")
      .upsert(articles, { onConflict: "url", ignoreDuplicates: true })
      .select("id");

    if (error) throw error;

    const saved = data?.length ?? 0;
    console.log(`Saved ${saved} new articles from ${feed.name}`);
    return { name: feed.name, saved };
  } catch (err) {
    const message = describeError(err);
    console.error(`Error fetching ${feed.name}: ${message}`);
    return { name: feed.name, saved: 0, error: message };
  }
}

export async function fetchAllFeeds(): Promise<FetchAllFeedsResult> {
  const supabase = createRawArticlesClient();

  // All 15 feeds fetched concurrently — sequential would risk running past
  // Vercel's function timeout (10s on Hobby) since each feed can take a few
  // seconds on its own. Each feed's errors are caught individually (above),
  // so Promise.all never rejects here.
  const results = await Promise.all(ACTIVE_FEEDS.map((feed) => processFeed(feed, supabase)));
  const totalSaved = results.reduce((sum, r) => sum + r.saved, 0);

  console.log(`Fetch complete. Total new articles saved: ${totalSaved}`);
  return { results, totalSaved };
}
