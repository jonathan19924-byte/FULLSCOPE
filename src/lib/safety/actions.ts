"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";

export type ReportReason = "spam" | "harassment" | "inappropriate" | "misinformation" | "other";
export type ReportTargetType = "post" | "comment" | "user";

export async function reportContentAction(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.common.notSignedInError };
  }

  const { error } = await supabase.from("content_reports").insert({
    reporter_id: user.id,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    details: input.details?.trim() || null,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/** Toggles the current user's block of `blockedId` — same
 * check-then-insert-or-delete shape as toggleFollowAction. Blocking removes
 * the blocked user's posts/comments from the caller's feed (see
 * getCommunityPosts / getPostComments), independent of any report. */
export async function toggleBlockAction(
  blockedId: string,
): Promise<{ blocked: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.common.notSignedInError };
  }

  if (user.id === blockedId) {
    return { error: t.safety.cantBlockSelf };
  }

  const { data: existing } = await supabase
    .from("user_blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("user_blocks").delete().eq("id", existing.id);
    if (error) return { error: error.message };
    revalidatePath("/posts");
    revalidatePath("/settings/blocked");
    return { blocked: false };
  }

  const { error } = await supabase.from("user_blocks").insert({ blocker_id: user.id, blocked_id: blockedId });
  if (error) return { error: error.message };

  revalidatePath("/posts");
  revalidatePath("/settings/blocked");
  return { blocked: true };
}
