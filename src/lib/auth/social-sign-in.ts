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

/** Reads a claim out of a JWT's payload segment — used here only for the
 * temporary diagnostic log, not to decide what to send Supabase (Supabase
 * hashes whatever nonce it's given and compares that to the token's own
 * claim, so echoing the claim itself back can never match). */
function decodeJwtClaims(jwt: string): Record<string, unknown> {
  try {
    const payloadSegment = jwt.split(".")[1];
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  let binary = "";
  new Uint8Array(digest).forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signInWithIdToken(
  provider: "apple" | "google",
  idToken: string,
  nonce?: string,
): Promise<SignInResult> {
  const supabase = createClient();
  console.debug("[social-sign-in]", { provider, sentNonce: nonce, tokenClaims: decodeJwtClaims(idToken) });
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
  // Confirmed via live device logging: unlike Apple, Google's SDK does NOT
  // hash the nonce we request — the ID token's nonce claim ends up holding
  // our raw value verbatim. Supabase's signInWithIdToken, on the other
  // hand, hashes whatever nonce it's given (base64url SHA-256) before
  // comparing to the token's claim. So we must hash *before* sending to
  // Google (so the claim ends up holding the hash), and send the original
  // raw value to Supabase (so its own hash matches that claim).
  //
  // forcePrompt is also required — without it, iOS's Credential Manager
  // silently returns a cached ID token from an earlier sign-in (same nonce
  // claim every time, regardless of what's requested) instead of running a
  // fresh interactive sign-in.
  const rawNonce = crypto.randomUUID();
  const hashedNonce = await sha256Base64Url(rawNonce);
  const res = await SocialLogin.login({
    provider: "google",
    options: { scopes: ["email", "profile"], nonce: hashedNonce, forcePrompt: true },
  });
  const idToken = res.result.responseType === "online" ? res.result.idToken : null;
  if (!idToken) return { error: "Google didn't return an identity token." };
  return signInWithIdToken("google", idToken, rawNonce);
}
