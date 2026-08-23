import type { Metadata } from "next";
import { NotificationsPageClient } from "@/components/notifications/notifications-page-client";
import { PullToRefresh } from "@/components/shared/pull-to-refresh";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.notifications.title };

export default function NotificationsPage() {
  return (
    <PullToRefresh>
      <NotificationsPageClient />
    </PullToRefresh>
  );
}
