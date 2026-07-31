"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export async function updateProfileAction(input: {
  username: string;
  displayName: string;
  bio: string;
}): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: t.common.notSignedInError };
  }

  const username = input.username.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    return { error: t.profile.usernameInvalid };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      display_name: input.displayName.trim() || null,
      bio: input.bio.trim() || null,
    })
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
  return { success: true };
}
