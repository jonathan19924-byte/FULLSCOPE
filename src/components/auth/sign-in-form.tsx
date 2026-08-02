"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { t } from "@/lib/i18n";

export function SignInForm() {
  const router = useRouter();
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
  // permanently blocked waiting for a widget that will never render.
  const captchaRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const captchaPending = captchaRequired && !captchaToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
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
    router.push(next);
    router.refresh();
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
        <span className="text-sm font-medium text-foreground">{t.auth.password}</span>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 w-full rounded-xl border border-border bg-background px-3.5 text-[15px] text-foreground outline-none focus-visible:border-foreground/40"
        />
      </label>

      <TurnstileWidget onVerify={setCaptchaToken} />

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
