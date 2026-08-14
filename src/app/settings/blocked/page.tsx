import type { Metadata } from "next";
import { BlockedAccountsPageClient } from "@/components/settings/blocked-accounts-page-client";
import { getBlockedProfiles } from "@/lib/safety/get-blocked";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.safety.blockedAccountsPageTitle };

export default async function BlockedAccountsPage() {
  const blocked = await getBlockedProfiles();
  return <BlockedAccountsPageClient initialBlocked={blocked} />;
}
