/**
 * Manual entry point for the RSS ingestion pipeline — the same logic the
 * daily Vercel cron runs (src/app/api/cron/fetch-rss/route.ts). Fetches all
 * 15 configured feeds and upserts new articles into raw_articles.
 *
 * Run with: npm run fetch-rss
 */
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "..", ".env.local") });

import { fetchAllFeeds } from "../src/lib/rss/fetch-rss";

fetchAllFeeds()
  .then(({ totalSaved }) => {
    process.exit(totalSaved >= 0 ? 0 : 1);
  })
  .catch((err) => {
    console.error("Fatal error running fetch-rss:", err);
    process.exit(1);
  });
