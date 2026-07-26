/**
 * Manual entry point for Stage 2 of the pipeline — the same logic the daily
 * Vercel cron runs (src/app/api/cron/process-articles/route.ts). Clusters
 * unprocessed raw_articles by topic, generates a Story + 10 posts per
 * cluster via Claude, and marks the source articles processed.
 *
 * Run with: npm run process-articles
 * (Run after npm run fetch-rss — there needs to be unprocessed articles.)
 */
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "..", ".env.local") });

import { processArticles } from "../src/lib/articles/process-articles";

processArticles()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error running process-articles:", err);
    process.exit(1);
  });
