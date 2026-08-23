import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getBookmarkedPostIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase.from("post_bookmarks").select("post_id").eq("user_id", user.id);
  return (data ?? []).map((row) => row.post_id);
}
