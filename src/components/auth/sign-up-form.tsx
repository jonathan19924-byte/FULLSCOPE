"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { updateProfileAction } from "@/lib/profile/actions";
import { Button } from "@/components/ui/button";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { t } from "@/lib/i18n";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function SignUpForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  // Only require the token when Turnstile is actually configured — mirrors
  // TurnstileWidget's own check, so local dev (no site key set) isn't
  // permanently blocked waiting for a widget that will never render.
  const captchaRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const captchaPending = captchaRequired && !captchaToken;
  const usernameFormatValid = USERNAME_PATTERN.test(username);

  // Live "is this taken" check — profiles are publicly readable, so this is
  // a plain client-side query, no new server action needed. Debounced so it
  // doesn't fire on every keystroke; a final check also happens implicitly
  // via the unique constraint if this race loses to someone else between
  // typing and submit (handled gracefully below, not blocked on).
  useEffect(() => {
    if (!usernameFormatValid) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.from("profiles").select("user_id").eq("username", username).maybeSingle();
      if (!cancelled) setUsernameAvailable(!data);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, usernameFormatValid]);

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

    if (error) {
      setIsSubmitting(false);
      setError(error.message);
      return;
    }

    // signUp() returns an active session immediately (this project doesn't
    // require email confirmation), so the username can be claimed as part
    // of the same flow. If this specific call fails — e.g. someone else
    // grabbed the name in the moment between the check above and here —
    // the account still exists; they just land without a username set yet,
    // same as any account created before this feature existed, and can
    // claim one via Settings. Not worth blocking account creation over.
    const profileResult = await updateProfileAction({ username, displayName: "", bio: "" });
    setIsSubmitting(false);

    if ("error" in profileResult) {
      toast(t.profile.couldntSaveProfile, { description: profileResult.error });
    }

    toast(t.auth.accountCreatedToast, { description: t.auth.accountCreatedDescription });
    // Full navigation, not router.push — see sign-in-form.tsx for why.
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
        <span className="text-sm font-medium text-foreground">{t.profile.usernameLabel}</span>
        <div dir="ltr" className="flex h-12 items-center gap-1 rounded-xl border border-border bg-background px-3.5">
          <span className="text-sm text-muted-foreground">@</span>
          <input
            type="text"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder={t.profile.usernamePlaceholder}
            maxLength={20}
            className="h-full w-full bg-transparent text-[15px] text-foreground outline-none"
          />
        </div>
        {username && usernameFormatValid && usernameAvailable === false ? (
          <span className="text-xs text-destructive">{t.profile.usernameTaken}</span>
        ) : username && !usernameFormatValid ? (
          <span className="text-xs text-muted-foreground">{t.profile.usernameHint}</span>
        ) : null}
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
        disabled={isSubmitting || captchaPending || !usernameFormatValid || usernameAvailable === false}
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
