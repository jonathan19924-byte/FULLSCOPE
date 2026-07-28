/**
 * Manual entry point for the every-2-hours periodic pass over real reader
 * posts — same logic the GitHub Actions cron runs
 * (.github/workflows/check-trends.yml). Does two things:
 *  1. Trend detection: folds a point made by several distinct users into
 *     the relevant story when found.
 *  2. Moderation: hides posts that violate content policy.
 * Bundled into one script/cron since they run on the same cadence over the
 * same underlying data.
 *
 * Run with: npm run check-trends
 */
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "..", ".env.local") });

import { checkStoryTrends } from "../src/lib/articles/trend-detection";
import { moderateNewPosts } from "../src/lib/articles/moderation";

async function main() {
  // Moderation runs first so a flagged post is already hidden before trend
  // detection queries for uncredited posts — it should never have a chance
  // to be folded into a story's content within the same pass.
  const moderationResult = await moderateNewPosts();
  console.log(
    `Moderation: checked ${moderationResult.checked} posts, flagged ${moderationResult.flagged}, ${moderationResult.errors} errors.`,
  );

  const trendResult = await checkStoryTrends();
  console.log(
    `Trends: checked ${trendResult.storiesChecked} stories, updated ${trendResult.storiesUpdated}, ${trendResult.errors} errors.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error running check-trends:", err);
    process.exit(1);
  });
