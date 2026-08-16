"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPostPhotoClean } from "@/lib/posts/media-moderation";
import { t } from "@/lib/i18n";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

// These are real routes under /profile/[username] — a matching username
// would be unreachable (the static route always wins) and would shadow the
// followers/following list pages.
const RESERVED_USERNAMES = new Set(["followers", "following"]);

export async function updateProfileAction(input: {
  username: string;
  displayName: string;
  bio: string;
  /** undefined = leave the avatar untouched; null = remove it; a string =
   * a freshly-uploaded photo URL to moderate and (if clean) set as the new
   * avatar. */
  avatarUrl?: string | null;
}): Promise<{ success: true; avatarRejected?: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.common.notSignedInError };
  }

  const username = input.username.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username) || RESERVED_USERNAMES.has(username)) {
    return { error: t.profile.usernameInvalid };
  }

  // Checked synchronously, same reasoning as createCommunityPostAction's
  // photo check — an unmoderated public-facing avatar going live even
  // briefly is worse than a short upload delay. A rejected photo is stored
  // (avatar_status: 'rejected') rather than discarded, purely so it never
  // gets treated as "approved" by any query — profile-repository.ts only
  // ever surfaces avatar_url when avatar_status is 'approved'.
  let avatarRejected = false;
  const updatePayload: {
    username: string;
    display_name: string | null;
    bio: string | null;
    avatar_url?: string | null;
    avatar_status?: string | null;
  } = {
    username,
    display_name: input.displayName.trim() || null,
    bio: input.bio.trim() || null,
  };

  if (input.avatarUrl === null) {
    updatePayload.avatar_url = null;
    updatePayload.avatar_status = null;
  } else if (input.avatarUrl) {
    const clean = await isPostPhotoClean(input.avatarUrl);
    avatarRejected = !clean;
    updatePayload.avatar_url = input.avatarUrl;
    updatePayload.avatar_status = clean ? "approved" : "rejected";
  }

  // Moderation decision is a trusted server decision, not something the
  // user's own row-ownership RLS policy should grant write access to —
  // same reasoning as community post media_status, hence the admin client
  // for this specific update rather than the user's own RLS-scoped session.
  const { error } = await createAdminClient()
    .from("profiles")
    .update(updatePayload)
    .eq("user_id", user.id);

  if (error) {
    // Postgres unique_violation
    if (error.code === "23505") {
      return { error: t.profile.usernameTaken };
    }
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/profile");
  revalidatePath(`/profile/${username}`);
  revalidatePath("/posts");
  revalidatePath("/search");
  return { success: true, avatarRejected };
}
