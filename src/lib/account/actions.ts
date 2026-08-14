"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { t } from "@/lib/i18n";

/**
 * Deletes the current user's account and all their data — required for App
 * Store Guideline 5.1.1(v) (any app with account creation must offer
 * in-app, self-service deletion, not just a "contact us" instruction).
 *
 * Every table with a user_id column references auth.users with
 * `on delete cascade` (see supabase/migrations — profiles, community_posts,
 * community_post_comments, community_post_likes, follows, user_blocks,
 * content_reports, notifications, bookmarks, story_dislikes), so deleting
 * the auth user alone removes all of it at the database level. The one
 * exception is Storage: uploaded post photos live in the `post-photos`
 * bucket, which isn't a Postgres foreign key and survives the auth user's
 * deletion unless removed explicitly, so that's done first below.
 */
export async function deleteAccountAction(): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.common.notSignedInError };
  }

  const admin = createAdminClient();

  const { data: files } = await admin.storage.from("post-photos").list(user.id);
  if (files && files.length > 0) {
    await admin.storage.from("post-photos").remove(files.map((file) => `${user.id}/${file.name}`));
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return { error: error.message };
  }

  // Best-effort — the account is already gone at this point regardless of
  // whether this succeeds, so its result doesn't change the outcome.
  await supabase.auth.signOut();

  return { success: true };
}
