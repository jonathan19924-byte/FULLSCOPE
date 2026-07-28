import type { Metadata } from "next";
import { ProfilePageClient } from "@/components/profile/profile-page-client";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.profile.title };

export default function ProfilePage() {
  return <ProfilePageClient />;
}
