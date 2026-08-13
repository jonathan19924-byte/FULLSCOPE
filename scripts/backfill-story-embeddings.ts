/**
 * One-off / catch-up entry point: backfills embeddings for existing stories
 * missing one (everything generated before 2026-08-13), without touching
 * clustering or story generation. Run once after applying
 * supabase/migrations/0025_story_embeddings.sql and setting VOYAGE_API_KEY.
 *
 * Run with: npm run backfill-story-embeddings
 */
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "..", ".env.local") });

import { backfillEmbeddingsOnly } from "../src/lib/articles/process-articles";

backfillEmbeddingsOnly()
  .then((count) => {
    console.log(`Backfilled ${count} stories.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal error running backfill-story-embeddings:", err);
    process.exit(1);
  });
