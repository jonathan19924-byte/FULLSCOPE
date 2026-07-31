"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { t } from "@/lib/i18n";

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });

    setIsSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    toast(t.auth.accountCreatedToast, { description: t.auth.accountCreatedDescription });
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
          minLength={6}
          autoComplete="new-password"
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
        {isSubmitting ? t.auth.creatingAccount : captchaPending ? t.auth.verifyingHuman : t.auth.createAccount}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t.auth.alreadyHaveAccount}{" "}
        <Link
          href={next !== "/" ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in"}
          className="font-medium text-foreground underline underline-offset-2"
        >
          {t.auth.signIn}
        </Link>
      </p>
    </form>
  );
}
