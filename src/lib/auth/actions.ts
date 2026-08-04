"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

type SessionTokens = { accessToken: string; refreshToken: string };

/**
 * Sign-in path for the native app shell, which skips Turnstile entirely
 * (see isNativeApp's doc comment) — but Supabase Auth enforces its captcha
 * requirement server-side too, on every password-grant request regardless
 * of what the client sends, so a client that never gets a token still gets
 * rejected. Routing through the service-role client here sidesteps that:
 * service-role-authenticated requests aren't subject to the public client's
 * captcha gate, since they're already server-to-server and trusted. Returns
 * raw tokens rather than setting cookies directly, because the caller then
 * calls the browser client's setSession() with them — the same pattern
 * already used by /auth/callback for the password-reset flow.
 */
export async function nativeSignInAction(
  email: string,
  password: string,
): Promise<SessionTokens | { error: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return { error: error?.message ?? "Sign in failed" };
  }

  return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
}

/**
 * Sign-up path for the native app shell — same captcha problem as sign-in,
 * but solved differently: admin.createUser is an admin-only operation with
 * no password-grant flow at all, so it was never subject to the captcha
 * gate in the first place (this project's existing test-user scripts have
 * relied on that all along). Signs the freshly-created user in immediately
 * after via nativeSignInAction, since mailer_autoconfirm means a normal
 * signUp() call also returns an active session, and native should match
 * that behavior.
 */
export async function nativeSignUpAction(
  email: string,
  password: string,
): Promise<SessionTokens | { error: string }> {
  const admin = createAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return { error: createError.message };
  }

  return nativeSignInAction(email, password);
}
