import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * This MVP has no login and no Supabase project configured (see AGENTS.md —
 * no accounts, bookmarks stored locally on the device). The Supabase-backed
 * session refresh that used to live here (see lib/supabase/proxy.ts) crashed
 * every request with "Your project's URL and Key are required to create a
 * Supabase client!" because no .env.local exists. Left as a no-op passthrough;
 * lib/supabase/proxy.ts is kept, unused, for a future version that adds real
 * accounts.
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}
