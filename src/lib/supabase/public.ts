import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Anon-key Supabase client with no cookie/session handling — for reading
 * genuinely public data (stories, posts) that doesn't depend on who's
 * asking. Unlike src/lib/supabase/server.ts, this never calls cookies(),
 * so it's safe to use inside unstable_cache (which forbids request-scoped
 * dynamic APIs in the cached function body).
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
