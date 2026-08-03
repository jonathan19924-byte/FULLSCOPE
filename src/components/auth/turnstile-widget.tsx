"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

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

  if (!siteKey) return null;

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
