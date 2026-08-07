import type { Metadata } from "next";
import { NotificationsPageClient } from "@/components/notifications/notifications-page-client";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.notifications.title };

export default function NotificationsPage() {
  return <NotificationsPageClient />;
}
