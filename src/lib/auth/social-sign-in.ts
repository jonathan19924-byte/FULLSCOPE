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

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signInWithIdToken(
  provider: "apple" | "google",
  idToken: string,
  nonce?: string,
): Promise<SignInResult> {
  const supabase = createClient();
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
  // Google (like Apple) expects the SHA-256 hash of the nonce in the
  // sign-in request — the ID token's nonce claim ends up holding that same
  // hash — while Supabase's signInWithIdToken wants the raw, pre-hash
  // value so it can hash it itself and compare. Sending the raw value to
  // both sides (as with a provider that doesn't hash) produces a mismatch.
  const rawNonce = crypto.randomUUID();
  const hashedNonce = await sha256Hex(rawNonce);
  const res = await SocialLogin.login({
    provider: "google",
    options: { scopes: ["email", "profile"], nonce: hashedNonce },
  });
  const idToken = res.result.responseType === "online" ? res.result.idToken : null;
  if (!idToken) return { error: "Google didn't return an identity token." };
  return signInWithIdToken("google", idToken, rawNonce);
}
