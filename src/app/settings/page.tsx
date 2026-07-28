import type { Metadata } from "next";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.settings.title };

export default function SettingsPage() {
  return <SettingsPageClient />;
}
