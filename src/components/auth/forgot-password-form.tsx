"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { t } from "@/lib/i18n";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Same reasoning as sign-in/sign-up: only require the token when
  // Turnstile is actually configured, and Supabase's captcha protection
  // covers password recovery too, not just sign-in/sign-up.
  const captchaRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const captchaPending = captchaRequired && !captchaToken;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      captchaToken: captchaToken ?? undefined,
    });

    setIsSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-foreground/90">{t.auth.resetEmailSentDescription}</p>
        <Link href="/sign-in" className="text-center text-sm font-medium text-foreground underline underline-offset-2">
          {t.auth.backToSignIn}
        </Link>
      </div>
    );
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
          className="h-12 w-full rounded-xl border border-border bg-background px-3.5 text-[16px] text-foreground outline-none focus-visible:border-foreground/40"
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
        {isSubmitting ? t.auth.sendingResetLink : captchaPending ? t.auth.verifyingHuman : t.auth.sendResetLink}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/sign-in" className="font-medium text-foreground underline underline-offset-2">
          {t.auth.backToSignIn}
        </Link>
      </p>
    </form>
  );
}
