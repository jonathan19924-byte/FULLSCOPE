import type { Metadata } from "next";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { getMyProfile } from "@/lib/profile/profile-repository";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.settings.title };

export default async function SettingsPage() {
  const myProfile = await getMyProfile();
  return <SettingsPageClient myProfile={myProfile} />;
}
