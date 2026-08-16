import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfilesByUserIds } from "@/lib/profile/profile-repository";
import { messageFor, linkFor } from "@/lib/notifications/message-for";
import { sendApnsPush } from "@/lib/push/apns";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Called by the handle_new_notification() Postgres trigger (via pg_net) the
 * moment a row lands in `notifications` — see
 * supabase/migrations/0031_push_notification_webhook.sql. Same shared-secret
 * auth pattern as /api/webhooks/new-signup, since the caller is the database
 * itself, not a signed-in user.
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.PUSH_WEBHOOK_SECRET;
  const providedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { notificationId } = (await request.json()) as { notificationId?: string };
  if (!notificationId) {
    return NextResponse.json({ error: "notificationId is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: notification } = await supabase
    .from("notifications")
    .select("id, user_id, type, actor_user_id, related_post_id, related_story_slug")
    .eq("id", notificationId)
    .single();

  if (!notification) {
    return NextResponse.json({ ok: true, skipped: "notification not found" });
  }

  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("id, token")
    .eq("user_id", notification.user_id);

  if (!tokens || tokens.length === 0) {
    return NextResponse.json({ ok: true, skipped: "no device tokens" });
  }

  const actor = notification.actor_user_id
    ? (await getProfilesByUserIds([notification.actor_user_id], supabase)).get(notification.actor_user_id)
    : undefined;

  const body = messageFor({
    type: notification.type,
    actorDisplayName: actor?.displayName ?? undefined,
    actorUsername: actor?.username ?? undefined,
  });
  const path = linkFor({
    type: notification.type,
    relatedStorySlug: notification.related_story_slug ?? undefined,
    actorUsername: actor?.username ?? undefined,
  });

  const results = await Promise.all(
    tokens.map(async (row) => {
      const result = await sendApnsPush(row.token, {
        title: "FullScope",
        body,
        url: path,
      });
      if (!result.ok && result.shouldRemoveToken) {
        await supabase.from("device_tokens").delete().eq("id", row.id);
      }
      return result;
    }),
  );

  return NextResponse.json({ ok: true, sent: results.filter((r) => r.ok).length });
}
