"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setIsSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Full navigation — same reasoning as sign-in/sign-up: avoids a stale
    // pre-auth render of the destination page from the router cache.
    window.location.href = "/profile";
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">{t.auth.newPassword}</span>
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

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" size="lg" disabled={isSubmitting} className="h-12 w-full rounded-full">
        {isSubmitting ? t.auth.savingPassword : t.auth.setNewPassword}
      </Button>
    </form>
  );
}
