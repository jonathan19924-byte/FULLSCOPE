"use server";

import { createClient } from "@/lib/supabase/server";
import { getNotifications, getUnreadNotificationCount } from "./get-notifications";
import type { Notification } from "@/types/domain";
import { t } from "@/lib/i18n";

/** Re-fetches the signed-in reader's notifications — used by the client
 * context to refresh the bell (periodic poll, or when the dropdown opens),
 * since there's no realtime/push infra to push updates instead. */
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
