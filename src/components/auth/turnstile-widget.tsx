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

/** Cloudflare Turnstile widget for the sign-up form — bot-signup mitigation
 * that Supabase Auth verifies server-side (once Turnstile is enabled under
 * Authentication > Settings in the Supabase dashboard with the matching
 * secret key). Renders nothing if no site key is configured, so sign-up
 * keeps working unchanged until that's set up. */
export function TurnstileWidget({ onVerify }: { onVerify: (token: string | null) => void }) {
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

  if (!siteKey || skipForNativeApp) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div ref={containerRef} className="w-full" />
    </>
  );
}
