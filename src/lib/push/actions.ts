"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Upserts the device's APNs token for the signed-in user — called once
 * per app launch by push-registration.tsx. token is globally unique (see
 * 0030_device_tokens.sql), so re-registering the same device (reinstall,
 * token refresh, or a different account signing in later) overwrites the
 * previous owner rather than accumulating stale rows. Uses the admin client
 * for the write (not the cookie-scoped one) because reassigning a token to
 * a new owner fails RLS's row-level check on the *existing* row — the
 * caller's identity is already confirmed via auth.getUser() below, same
 * trusted-server-decision reasoning as updateProfileAction's avatar_status. */
export async function registerDeviceTokenAction(token: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await createAdminClient()
    .from("device_tokens")
    .upsert(
      { user_id: user.id, token, platform: "ios", last_seen_at: new Date().toISOString() },
      { onConflict: "token" },
    );
}
