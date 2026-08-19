"use server";

import { createClient } from "@/lib/supabase/server";
import { getNotifications, getUnreadNotificationCount } from "./get-notifications";
import type { Notification } from "@/types/domain";
import { t } from "@/lib/i18n";

/** Re-fetches the signed-in reader's notifications — used by the client
 * context to refresh the bell (periodic poll, or when the dropdown opens).
 * APNs pushes reach the device when it's backgrounded, but there's no
 * realtime channel (e.g. websocket) to live-update this in-app bell while
 * the app is open, hence the poll. */
export async function fetchNotificationsAction(): Promise<{
  notifications: Notification[];
  unreadCount: number;
}> {
  const [notifications, unreadCount] = await Promise.all([
    getNotifications(),
    getUnreadNotificationCount(),
  ]);
  return { notifications, unreadCount };
}

export async function markNotificationsReadAction(): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.common.notSignedInError };
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) return { error: error.message };
  return { success: true };
}

export type NotificationPreferenceKey = "push_enabled" | "event_updates_enabled" | "post_interactions_enabled";

/** Backs the three Settings toggles (push master switch, event updates,
 * post interactions). Only gates the push send (send-push/route.ts) — the
 * in-app notification row is still always created regardless of these. */
export async function updateNotificationPreferenceAction(
  key: NotificationPreferenceKey,
  value: boolean,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.common.notSignedInError };
  }

  // Supabase's Update type rejects a computed { [key]: value } — TS can't
  // verify a dynamic key against the strict column union — so switch on it
  // explicitly instead.
  const { error } =
    key === "push_enabled"
      ? await supabase.from("profiles").update({ push_enabled: value }).eq("user_id", user.id)
      : key === "event_updates_enabled"
        ? await supabase.from("profiles").update({ event_updates_enabled: value }).eq("user_id", user.id)
        : await supabase.from("profiles").update({ post_interactions_enabled: value }).eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}
