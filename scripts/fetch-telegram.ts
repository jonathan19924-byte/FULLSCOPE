/**
 * Manual entry point for the Telegram ingestion pipeline — same logic run in
 * process-articles.yml alongside fetch-rss. Fetches all configured channels
 * and upserts new posts into raw_articles.
 *
 * Run with: npm run fetch-telegram
 */
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "..", ".env.local") });

import { fetchAllTelegramChannels } from "../src/lib/rss/fetch-telegram";

fetchAllTelegramChannels()
  .then(({ totalSaved }) => {
    process.exit(totalSaved >= 0 ? 0 : 1);
  })
  .catch((err) => {
    console.error("Fatal error running fetch-telegram:", err);
    process.exit(1);
  });
