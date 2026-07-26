import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { XMLParser } from "fast-xml-parser";

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
  { name: "Reuters", url: "https://feeds.reuters.com/reuters/topNews", lean: "centre" },
  { name: "Associated Press", url: "https://rsshub.app/apnews/topics/apf-topnews", lean: "centre" },
  { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", lean: "centre" },
  { name: "NPR", url: "https://feeds.npr.org/1001/rss.xml", lean: "left" },
  { name: "The Guardian", url: "https://www.theguardian.com/us/rss", lean: "left" },
  { name: "Democracy Now", url: "https://www.democracynow.org/democracynow.rss", lean: "left" },
  { name: "Fox News", url: "https://moxie.foxnews.com/feedburner/latest.xml", lean: "right" },
  { name: "The Daily Wire", url: "https://www.dailywire.com/feeds/rss.xml", lean: "right" },
  { name: "New York Post", url: "https://nypost.com/feed/", lean: "right" },
  { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", lean: "international" },
  { name: "France 24", url: "https://www.france24.com/en/rss", lean: "international" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", lean: "technology" },
  { name: "Wired", url: "https://www.wired.com/feed/rss", lean: "technology" },
  { name: "Science Daily", url: "https://www.sciencedaily.com/rss/all.xml", lean: "science" },
  { name: "Times of Israel", url: "https://www.timesofisrael.com/feed/", lean: "middle_east" },
];

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
  const raw = item.pubDate ?? item.published ?? item.updated ?? item.date;
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

  return [];
}

async function fetchFeedArticles(feed: FeedConfig): Promise<RawArticleRow[]> {
  const res = await fetch(feed.url, {
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
    const message = err instanceof Error ? err.message : String(err);
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
  const results = await Promise.all(FEEDS.map((feed) => processFeed(feed, supabase)));
  const totalSaved = results.reduce((sum, r) => sum + r.saved, 0);

  console.log(`Fetch complete. Total new articles saved: ${totalSaved}`);
  return { results, totalSaved };
}
