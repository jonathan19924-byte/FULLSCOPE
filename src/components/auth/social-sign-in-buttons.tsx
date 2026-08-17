"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isNativeApp } from "@/lib/capacitor";
import { signInWithApple, signInWithGoogle } from "@/lib/auth/social-sign-in";
import { t } from "@/lib/i18n";

/** Native-only — Apple/Google's ID-token sign-in flow needs the native SDKs,
 * which only run inside the Capacitor shell. The web version keeps
 * magic-link/password auth only. */
export function SocialSignInButtons({ next }: { next: string }) {
  const [pendingProvider, setPendingProvider] = useState<"apple" | "google" | null>(null);

  if (!isNativeApp()) return null;

  async function handleSignIn(provider: "apple" | "google") {
    setPendingProvider(provider);

    // The native plugin rejects (rather than resolving with an error) when
    // the user cancels the system sign-in sheet — without this catch, that
    // rejection would leave pendingProvider stuck forever, permanently
    // disabling both buttons.
    let result: Awaited<ReturnType<typeof signInWithApple>>;
    try {
      result = provider === "apple" ? await signInWithApple() : await signInWithGoogle();
    } catch (err) {
      setPendingProvider(null);
      toast(t.auth.socialSignInFailed, { description: err instanceof Error ? err.message : String(err) });
      return;
    }

    setPendingProvider(null);

    if ("error" in result) {
      toast(t.auth.socialSignInFailed, { description: result.error });
      return;
    }

    toast(t.auth.signedInToast);
    window.location.href = next;
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={pendingProvider !== null}
        onClick={() => handleSignIn("apple")}
        className="h-12 w-full rounded-full"
      >
        {t.auth.continueWithApple}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={pendingProvider !== null}
        onClick={() => handleSignIn("google")}
        className="h-12 w-full rounded-full"
      >
        {t.auth.continueWithGoogle}
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        {t.auth.orDivider}
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
