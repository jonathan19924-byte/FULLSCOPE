"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Handles a Supabase auth redirect (password recovery today; magic link or
 * OAuth would land here too) and forwards to `next` once a session exists.
 *
 * Must run client-side, not as a server Route Handler: testing this
 * project's actual recovery links directly (via a real generateLink call,
 * following the redirect for real) showed Supabase returns the session as a
 * `#access_token=...&refresh_token=...` URL FRAGMENT, not a `?code=...`
 * query param — fragments are never sent to the server at all, so a server
 * handler has no way to see them. This checks the fragment first (implicit
 * flow) and falls back to a `?code=` query param (PKCE, if a future flow
 * ever produces one) so either shape works.
 */
export default function AuthCallbackPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    async function run() {
      const supabase = createClient();
      const next = searchParams.get("next") ?? "/";

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        window.location.href = error ? "/sign-in" : next;
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        window.location.href = error ? "/sign-in" : next;
        return;
      }

      window.location.href = "/sign-in";
    }

    run();
  }, [searchParams]);

  return null;
}
