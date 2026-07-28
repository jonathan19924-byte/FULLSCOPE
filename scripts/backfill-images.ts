/**
 * One-off / catch-up entry point: backfills photos for existing stories
 * missing an image_url, without touching clustering or story generation.
 *
 * Run with: npm run backfill-images
 */
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "..", ".env.local") });

import { backfillImagesOnly } from "../src/lib/articles/process-articles";

backfillImagesOnly()
  .then((count) => {
    console.log(`Backfilled ${count} stories.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error running backfill-images:", err);
    process.exit(1);
  });
