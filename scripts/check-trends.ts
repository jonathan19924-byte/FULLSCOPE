/**
 * Manual entry point for trend detection — the same logic the every-2-hours
 * GitHub Actions cron runs (.github/workflows/check-trends.yml). Scans real
 * reader posts for a recurring point made by several distinct users and,
 * when found, folds it into the relevant story.
 *
 * Run with: npm run check-trends
 */
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "..", ".env.local") });

import { checkStoryTrends } from "../src/lib/articles/trend-detection";

checkStoryTrends()
  .then((result) => {
    console.log(
      `Checked ${result.storiesChecked} stories, updated ${result.storiesUpdated}, ${result.errors} errors.`,
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error running check-trends:", err);
    process.exit(1);
  });
