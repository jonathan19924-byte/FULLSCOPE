import type { Metadata } from "next";
import { listStorySummaries } from "@/lib/services/story-service";
import { BookmarksPageClient } from "@/components/bookmarks/bookmarks-page-client";
import { PullToRefresh } from "@/components/shared/pull-to-refresh";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.bookmarks.title };

export default async function BookmarksPage() {
  const stories = await listStorySummaries();
  return (
    <PullToRefresh>
      <BookmarksPageClient stories={stories} />
    </PullToRefresh>
  );
}
