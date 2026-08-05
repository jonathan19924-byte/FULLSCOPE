"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { isNativeApp } from "@/lib/capacitor";
import { nativeSignInAction } from "@/lib/auth/actions";
import { t } from "@/lib/i18n";

export function SignInForm() {
  const searchParams = useSearchParams();
  // Defaults to the profile page rather than home — landing on a
  // recognizably different page makes a successful sign-in obvious, instead
  // of returning to a big scrolling page that looks unchanged. An explicit
  // `next` (e.g. set when Follow/Like redirected here while signed out)
  // still wins, so those flows return to where the user actually was.
  const next = searchParams.get("next") ?? "/profile";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Only require the token when Turnstile is actually configured — mirrors
  // TurnstileWidget's own check, so local dev (no site key set) isn't
  // permanently blocked waiting for a widget that will never render. Also
  // skipped inside the native app shell — see isNativeApp's doc comment.
  const [captchaRequired, setCaptchaRequired] = useState(
    Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
  );
  // Set when Turnstile's script fails to load or load in time (blocked by a
  // content blocker, a restrictive network, or just slow) — without this,
  // the submit button sits permanently disabled on "Verifying…" with no way
  // out, since a token can never arrive. Falls back to the same server-side
  // captcha bypass already used inside the native app shell.
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  useEffect(() => {
    // One-time platform read, not a changing prop to derive from — the
    // lint rule's "adjust state during render" alternative doesn't apply
    // here, and there's no browser-safe way to read this before mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isNativeApp()) setCaptchaRequired(false);
  }, []);
  const captchaPending = captchaRequired && !captchaToken && !captchaUnavailable;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();

    if (isNativeApp() || captchaUnavailable) {
      const result = await nativeSignInAction(email, password);
      if ("error" in result) {
        setIsSubmitting(false);
        setError(result.error);
        return;
      }
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
      });
      setIsSubmitting(false);
      if (setSessionError) {
        setError(setSessionError.message);
        return;
      }
      toast(t.auth.signedInToast);
      window.location.href = next;
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });

    setIsSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    toast(t.auth.signedInToast);
    // A full navigation, not router.push — the App Router's client-side
    // cache can serve a stale (pre-sign-in) render of the destination page,
    // which looked like sign-in silently doing nothing since you'd land
    // back on a page that still treats you as signed out.
    window.location.href = next;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">{t.auth.email}</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-background px-3.5 text-[15px] text-foreground outline-none focus-visible:border-foreground/40"
        />
      </label>

      <label className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{t.auth.password}</span>
          <Link href="/forgot-password" className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground">
            {t.auth.forgotPassword}
          </Link>
        </div>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-background px-3.5 text-[15px] text-foreground outline-none focus-visible:border-foreground/40"
        />
      </label>

      <TurnstileWidget onVerify={setCaptchaToken} onLoadFailure={() => setCaptchaUnavailable(true)} />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting || captchaPending}
        className="h-12 w-full rounded-full"
      >
        {isSubmitting ? t.auth.signingIn : captchaPending ? t.auth.verifyingHuman : t.auth.signIn}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t.auth.noAccount}{" "}
        <Link
          href={next !== "/" ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"}
          className="font-medium text-foreground underline underline-offset-2"
        >
          {t.auth.signUp}
        </Link>
      </p>
    </form>
  );
}
