import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Refreshes the Supabase auth session cookie on every request and redirects
 * unauthenticated visitors away from the personal-only routes (/bookmarks,
 * /profile). Story browsing (/, /story/[slug], /search, /posts) and /create
 * stay open to everyone — /create only requires a session at submit time.
 */
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
