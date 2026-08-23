import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfileByUsername, getFollowingList } from "@/lib/profile/profile-repository";
import { FollowListPageClient } from "@/components/profile/follow-list-page-client";
import { PullToRefresh } from "@/components/shared/pull-to-refresh";
import { t } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `${t.profile.followingPageTitle} — @${username}` };
}

export default async function UserFollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const following = await getFollowingList(profile.userId);

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
