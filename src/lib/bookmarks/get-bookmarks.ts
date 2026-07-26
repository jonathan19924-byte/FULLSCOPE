import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getBookmarkedSlugs(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase.from("bookmarks").select("story_slug").eq("user_id", user.id);
  return (data ?? []).map((row) => row.story_slug);
}
