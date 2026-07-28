import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface StoryUpdate {
  id: string;
  updateType: "trend" | "merge";
  summary: string;
  createdAt: string;
}

/** The "this story has developed" history — entries logged by
 * trend-detection (a reader trend changed the content) and process-articles'
 * dedup pass (a duplicate got merged in), oldest first so it reads as a
 * timeline. */
export async function getStoryUpdates(storyId: string): Promise<StoryUpdate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("story_updates")
    .select("id, update_type, summary, created_at")
    .eq("story_id", storyId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    updateType: row.update_type as "trend" | "merge",
    summary: row.summary,
    createdAt: row.created_at,
  }));
}
