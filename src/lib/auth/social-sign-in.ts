"use client";

import { SocialLogin } from "@capgo/capacitor-social-login";
import { createClient } from "@/lib/supabase/client";

const GOOGLE_IOS_CLIENT_ID = "630338883088-h2iveva720mu0t99thli0vcr9rhg0j2a.apps.googleusercontent.com";
const GOOGLE_WEB_CLIENT_ID = "630338883088-3lfnavtt6a5kunankfu2kj1rh9tt4dtc.apps.googleusercontent.com";
const APPLE_SERVICES_ID = "com.fullscope.app.signin";

let initialized: Promise<void> | null = null;

// Both providers are initialized together (rather than lazily per-button)
// since SocialLogin.initialize() is a single call across all configured
// providers — cached in a module-scope promise so repeated sign-in attempts
// (e.g. after a first failed login) don't re-initialize.
function ensureInitialized(): Promise<void> {
  if (!initialized) {
    initialized = SocialLogin.initialize({
      apple: { clientId: APPLE_SERVICES_ID },
      google: {
        iOSClientId: GOOGLE_IOS_CLIENT_ID,
        iOSServerClientId: GOOGLE_WEB_CLIENT_ID,
        mode: "online",
      },
    });
  }
  return initialized;
}

type SignInResult = { success: true } | { error: string };

/** Reads the `nonce` claim actually embedded in a JWT's payload, if any —
 * rather than trying to predict what nonce the native SDK ends up using
 * (Google's plugin accepts a requested nonce but doesn't reliably honor it
 * as-given), this reads back the real value from the token itself so
 * whatever we pass to Supabase is guaranteed to match. */
function decodeJwtNonce(jwt: string): string | undefined {
  try {
    const payloadSegment = jwt.split(".")[1];
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    const claims = JSON.parse(json) as { nonce?: string };
    return claims.nonce;
  } catch {
    return undefined;
  }
}

async function signInWithIdToken(provider: "apple" | "google", idToken: string): Promise<SignInResult> {
  const supabase = createClient();
  const nonce = decodeJwtNonce(idToken);
  const { error } = await supabase.auth.signInWithIdToken({ provider, token: idToken, nonce });
  if (error) return { error: error.message };
  return { success: true };
}

export async function signInWithApple(): Promise<SignInResult> {
  await ensureInitialized();
  const res = await SocialLogin.login({
    provider: "apple",
    options: { scopes: ["email", "name"] },
  });
  const idToken = res.result.idToken;
  if (!idToken) return { error: "Apple didn't return an identity token." };
  return signInWithIdToken("apple", idToken);
}

export async function signInWithGoogle(): Promise<SignInResult> {
  await ensureInitialized();
  const res = await SocialLogin.login({
    provider: "google",
    options: { scopes: ["email", "profile"] },
  });
  const idToken = res.result.responseType === "online" ? res.result.idToken : null;
  if (!idToken) return { error: "Google didn't return an identity token." };
  return signInWithIdToken("google", idToken);
}
