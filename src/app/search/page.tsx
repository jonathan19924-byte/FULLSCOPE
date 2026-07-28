import type { Metadata } from "next";
import { getAllStories } from "@/lib/repositories/story-repository";
import { SearchPageClient } from "@/components/search/search-page-client";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t.search.title };

export default async function SearchPage() {
  const stories = await getAllStories();
  return <SearchPageClient stories={stories} />;
}
