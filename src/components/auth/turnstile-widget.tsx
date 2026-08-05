"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { isNativeApp } from "@/lib/capacitor";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          size?: "flexible" | "normal" | "compact";
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

// How long to wait for Cloudflare's script to load before giving up and
// telling the parent form to fall back to captcha-free sign-up/sign-in.
// Real load times are typically under 1s; this is generous headroom for a
// slow connection before treating it as blocked/unreachable.
const LOAD_TIMEOUT_MS = 8000;

/** Cloudflare Turnstile widget for the sign-up/sign-in forms — bot-signup
 * mitigation that Supabase Auth verifies server-side. Renders nothing if no
 * site key is configured, so sign-up keeps working unchanged until that's
 * set up.
 *
 * The widget's container is an empty 0-height div until Cloudflare's script
 * loads and calls turnstile.render() into it — if that script is blocked
 * (content blocker, restrictive network/DNS filter) or just slow, the div
 * stays invisible forever with no error shown, and the submit button sits
 * permanently disabled on "Verifying…" with no way out (found via a real
 * user's screenshot: no widget box rendered at all, stuck button). onLoadFailure
 * fires — via the script's own onError, or this timeout — so the parent form
 * can fall back to the same server-side captcha bypass already used inside
 * the native app shell for the identical reason. */
export function TurnstileWidget({
  onVerify,
  onLoadFailure,
}: {
  onVerify: (token: string | null) => void;
  onLoadFailure?: () => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  // Starts false to match the server-rendered assumption (not native), then
  // flips right after mount if we're actually inside the app shell — see
  // isNativeApp's doc comment for why Turnstile is skipped there entirely.
  const [skipForNativeApp, setSkipForNativeApp] = useState(false);

  useEffect(() => {
    // One-time platform read, not a changing prop to derive from — the
    // lint rule's "adjust state during render" alternative doesn't apply
    // here, and there's no browser-safe way to read this before mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isNativeApp()) setSkipForNativeApp(true);
  }, []);

  useEffect(() => {
    if (!scriptLoaded || !siteKey || !containerRef.current || !window.turnstile) return;

    window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => onVerify(token),
      "expired-callback": () => onVerify(null),
      size: "flexible",
    });
    // onVerify is a stable setState wrapper from the parent — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded, siteKey]);

  useEffect(() => {
    if (!siteKey || skipForNativeApp) return;
    const timer = setTimeout(() => {
      if (!scriptLoaded) onLoadFailure?.();
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
    // onLoadFailure is a stable setState wrapper from the parent — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, skipForNativeApp, scriptLoaded]);

  if (!siteKey || skipForNativeApp) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => onLoadFailure?.()}
      />
      <div ref={containerRef} className="w-full" />
    </>
  );
}
