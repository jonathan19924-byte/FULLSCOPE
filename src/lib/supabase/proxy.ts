import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

// Exact-match paths, not prefixes — added 2026-07-31 alongside the public
// profile feature: a naive startsWith("/profile") check would also match
// /profile/[username], which must stay open to signed-out visitors (that's
// the entire point of a public, followable profile page).
const PROTECTED_PATHS = ["/bookmarks", "/profile"];

/**
 * Refreshes the Supabase auth session cookie on every request, and does an
 * optimistic redirect for the two auth-gated routes. This is *not* the
 * source of truth for authorization — pages still verify the session
 * themselves close to the data (see lib/services) — it just keeps the
 * session cookie alive and avoids a flash of protected content.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PATHS.includes(request.nextUrl.pathname);

  if (isProtected && !user) {
    const redirectUrl = new URL("/sign-in", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
