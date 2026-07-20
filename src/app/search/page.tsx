import type { Metadata } from "next";
import { getAllStories } from "@/lib/repositories/story-repository";
import { SearchPageClient } from "@/components/search/search-page-client";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage() {
  const stories = await getAllStories();
  return <SearchPageClient stories={stories} />;
}
