/**
 * Twice-daily entry point that picks the most-discussed story of the last
 * 24h and notifies every approved user, if it clears the minimum activity
 * bar and hasn't been picked again too recently — see
 * src/lib/articles/trending-notifications.ts for the actual logic.
 *
 * Run with: npm run notify-trending
 */
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "..", ".env.local") });

import { notifyTrendingStory } from "../src/lib/articles/trending-notifications";

async function main() {
  const result = await notifyTrendingStory();
  if (result.sent) {
    console.log(`Notified ${result.notifiedCount} users about trending story "${result.slug}".`);
  } else {
    console.log(`No trending notification sent: ${result.reason}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error running notify-trending:", err);
    process.exit(1);
  });
