import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

/**
 * Same backend-only ingestion client as fetch-rss.ts — raw_articles is a
 * shared staging table, not part of the app-facing schema.
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

export interface TelegramChannelConfig {
  name: string;
  handle: string;
}

/**
 * Added 2026-07-31 as a second raw content source alongside RSS (see
 * CONTENT_PIPELINE.md). All 8 handles were live-verified via t.me/s/<handle>
 * before being added here — confirmed real, active, and currently posting.
 * `lean` deliberately isn't assigned yet: doing that from a handful of
 * sample posts would just be guessing, and this session already corrected
 * one bias-by-guessing mistake in the RSS list. Every row from these
 * channels gets source_lean='unclassified' until there's enough real
 * content to make an actual judgment call — see the Decision Log.
 */
export const TELEGRAM_CHANNELS: TelegramChannelConfig[] = [
  { name: "עמיחי שטיין | הערוץ המדיני", handle: "US2020US" },
  { name: "אבו עלי אקספרס", handle: "abualiexpress" },
  { name: "דניאל עמרם ללא צנזורה", handle: "danielamram3" },
  { name: "זירה פוליטית", handle: "Political_arena" },
  { name: "עמית סגל", handle: "amitsegal" },
  { name: "חדשות 100שטח", handle: "yediotnews25" },
  { name: "אהרון ידיעות", handle: "aharonyediotnews" },
  { name: "אמיר אטינגר & יובל שגב", handle: "no_politix" },
  // Added 2026-08-04 — all live-verified (real, active, posting same-day)
  // before adding, same process as the original 8.
  { name: "אלמוג בוקר", handle: "almogboker78" },
  { name: "דפנה ליאל", handle: "lieldaphna" },
  { name: "צבי יחזקאלי", handle: "tzviyeh" },
  { name: "ינון מגל", handle: "yinonews" },
  { name: "בן כספית", handle: "Ben_Caspit" },
  { name: "בחדרי חרדים", handle: "behadrey" },
  { name: "חרדים אקספרס", handle: "haredimex" },
  { name: "חדשות ישראל מהשטח", handle: "newsisrael_live" },
  { name: "חדשות ישראל ללא צנזורה", handle: "israel1" },
  { name: "חדשות 8200 דיווחים ראשוניים", handle: "news_il" },
];

interface RawArticleRow {
  source_name: string;
  source_lean: "unclassified";
  source_type: "telegram";
  title: string;
  description: string | null;
  url: string;
  published_at: string | null;
}

export interface ChannelFetchResult {
  name: string;
  saved: number;
  error?: string;
}

export interface FetchAllChannelsResult {
  results: ChannelFetchResult[];
  totalSaved: number;
}

/** Telegram posts don't have a headline the way an RSS article does — this
 * derives one from the message body (first sentence, capped at ~12 words)
 * so "title" is never empty, same as every other source's row shape. */
function deriveTitle(text: string): string {
  const firstSentence = text.split(/(?<=[.!?׃])\s/)[0] ?? text;
  const words = firstSentence.trim().split(/\s+/);
  return words.length > 12 ? `${words.slice(0, 12).join(" ")}…` : firstSentence.trim();
}

async function fetchChannelArticles(channel: TelegramChannelConfig): Promise<RawArticleRow[]> {
  const res = await fetch(`https://t.me/s/${channel.handle}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FullScopeTelegramBot/1.0)" },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const rows: RawArticleRow[] = [];
  $(".tgme_widget_message").each((_, el) => {
    const $el = $(el);
    const postPath = $el.attr("data-post");
    const text = $el.find(".tgme_widget_message_text").first().text().trim();
    // Was "time.datetime, time" — the real timestamp element's class is
    // "time" (not "datetime"), so that half never matched and it fell
    // through to the bare "time" selector, which also matches Telegram's
    // video-duration <time> elements (no datetime attr, and DOM-earlier
    // than the real timestamp for video posts) — .first() silently grabbed
    // those instead. Selecting on the attribute's presence, not a guessed
    // class name, is what actually identifies the timestamp element.
    const datetime = $el.find("time[datetime]").first().attr("datetime");

    if (!postPath || !text) return; // skip photo/video-only posts with no caption

    rows.push({
      source_name: channel.name,
      source_lean: "unclassified",
      source_type: "telegram",
      title: deriveTitle(text),
      description: text,
      url: `https://t.me/${postPath}`,
      published_at: datetime ? new Date(datetime).toISOString() : null,
    });
  });

  return rows;
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

async function processChannel(
  channel: TelegramChannelConfig,
  supabase: ReturnType<typeof createRawArticlesClient>,
): Promise<ChannelFetchResult> {
  console.log(`Fetching ${channel.name}...`);

  try {
    const articles = await fetchChannelArticles(channel);

    if (articles.length === 0) {
      console.log(`Saved 0 new posts from ${channel.name}`);
      return { name: channel.name, saved: 0 };
    }

    const { data, error } = await supabase
      .from("raw_articles")
      .upsert(articles, { onConflict: "url", ignoreDuplicates: true })
      .select("id");

    if (error) throw error;

    const saved = data?.length ?? 0;
    console.log(`Saved ${saved} new posts from ${channel.name}`);
    return { name: channel.name, saved };
  } catch (err) {
    const message = describeError(err);
    console.error(`Error fetching ${channel.name}: ${message}`);
    return { name: channel.name, saved: 0, error: message };
  }
}

/** Mirrors fetchAllFeeds in fetch-rss.ts: all channels fetched concurrently,
 * each channel's errors caught individually so one blocked/renamed channel
 * doesn't fail the whole run. No Claude calls here — same reasoning as RSS
 * fetch for why running this frequently (every 3h, paired with fetch-rss)
 * costs almost nothing. */
export async function fetchAllTelegramChannels(): Promise<FetchAllChannelsResult> {
  const supabase = createRawArticlesClient();

  const results = await Promise.all(TELEGRAM_CHANNELS.map((channel) => processChannel(channel, supabase)));
  const totalSaved = results.reduce((sum, r) => sum + r.saved, 0);

  console.log(`Telegram fetch complete. Total new posts saved: ${totalSaved}`);
  return { results, totalSaved };
}
