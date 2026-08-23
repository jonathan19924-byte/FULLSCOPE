import type { Metadata } from "next";
import { FollowListPageClient } from "@/components/profile/follow-list-page-client";
import { PullToRefresh } from "@/components/shared/pull-to-refresh";
import { getMyProfile, getFollowers } from "@/lib/profile/profile-repository";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.profile.followersPageTitle };

export default async function MyFollowersPage() {
  const myProfile = await getMyProfile();
  const followers = myProfile ? await getFollowers(myProfile.userId) : [];

  return (
    <PullToRefresh>
      <FollowListPageClient
        title={t.profile.followersPageTitle}
        people={followers}
        emptyTitle={t.profile.noFollowersTitle}
        emptyDescription={t.profile.noFollowersDescription}
      />
    </PullToRefresh>
  );
}
