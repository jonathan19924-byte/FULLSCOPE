"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";

/** Toggles the current user's follow of `followeeId` — same
 * check-then-insert-or-delete shape as toggleBookmarkAction. */
export async function toggleFollowAction(
  followeeId: string,
): Promise<{ following: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.common.notSignedInError };
  }

  if (user.id === followeeId) {
    return { error: t.profile.cantFollowSelf };
  }

  const { data: existing } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("followee_id", followeeId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("follows").delete().eq("id", existing.id);
    if (error) return { error: error.message };
    revalidatePath("/posts");
    revalidatePath("/profile/[username]", "page");
    return { following: false };
  }

  const { error } = await supabase.from("follows").insert({ follower_id: user.id, followee_id: followeeId });
  if (error) return { error: error.message };

  revalidatePath("/posts");
  revalidatePath("/profile/[username]", "page");
  return { following: true };
}
