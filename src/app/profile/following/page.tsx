import type { Metadata } from "next";
import { FollowListPageClient } from "@/components/profile/follow-list-page-client";
import { PullToRefresh } from "@/components/shared/pull-to-refresh";
import { getMyProfile, getFollowingList } from "@/lib/profile/profile-repository";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.profile.followingPageTitle };

export default async function MyFollowingPage() {
  const myProfile = await getMyProfile();
  const following = myProfile ? await getFollowingList(myProfile.userId) : [];

  return (
    <PullToRefresh>
      <FollowListPageClient
        title={t.profile.followingPageTitle}
        people={following}
        emptyTitle={t.profile.noFollowingTitle}
        emptyDescription={t.profile.noFollowingDescription}
      />
    </PullToRefresh>
  );
}
