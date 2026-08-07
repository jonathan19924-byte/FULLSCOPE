import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProfileByUsername, getFollowers } from "@/lib/profile/profile-repository";
import { FollowListPageClient } from "@/components/profile/follow-list-page-client";
import { t } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `${t.profile.followersPageTitle} — @${username}` };
}

export default async function UserFollowersPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const followers = await getFollowers(profile.userId);

  return (
    <FollowListPageClient
      title={t.profile.followersPageTitle}
      people={followers}
      emptyTitle={t.profile.noFollowersTitle}
      emptyDescription={t.profile.noFollowersDescription}
    />
  );
}
