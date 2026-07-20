import type { Metadata } from "next";
import { listStorySummaries } from "@/lib/services/story-service";
import { BookmarksPageClient } from "@/components/bookmarks/bookmarks-page-client";

export const metadata: Metadata = { title: "Bookmarks" };

export default async function BookmarksPage() {
  const stories = await listStorySummaries();
  return <BookmarksPageClient stories={stories} />;
}
