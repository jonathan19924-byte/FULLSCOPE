"use client";

import { useNotifications } from "@/lib/notifications/notifications-context";

/** Small unread-count dot overlaid on the Notifications nav icon. Renders
 * nothing once there are no unread notifications (including for signed-out
 * readers, who always have initialUnreadCount 0). */
export function NotificationBadge() {
  const { unreadCount } = useNotifications();
  if (unreadCount === 0) return null;

  return (
    <span
      aria-hidden
      className="absolute -end-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-white"
    >
      {unreadCount > 9 ? "9+" : unreadCount}
    </span>
  );
}
