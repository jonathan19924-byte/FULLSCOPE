import type { Metadata } from "next";
import { ProfilePageClient } from "@/components/profile/profile-page-client";
import { getMyProfile } from "@/lib/profile/profile-repository";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.profile.title };

export default async function ProfilePage() {
  const myProfile = await getMyProfile();
  return (
    <ProfilePageClient
      followerCount={myProfile?.followerCount ?? 0}
      followingCount={myProfile?.followingCount ?? 0}
    />
  );
}
