import { NextResponse, type NextRequest } from "next/server";
import { sendNewSignupEmail } from "@/lib/notifications/email";

export const dynamic = "force-dynamic";

/**
 * Called by the handle_new_user() Postgres trigger (via pg_net) the moment
 * a new profile row is created — see supabase/migrations/0019_signup_notification.sql.
 * Authenticated by a shared secret rather than Supabase auth, since the
 * caller is the database itself, not a signed-in user.
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.SIGNUP_WEBHOOK_SECRET;
  const providedSecret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email, userId } = (await request.json()) as { email?: string; userId?: string };
  if (!email || !userId) {
    return NextResponse.json({ error: "email and userId are required" }, { status: 400 });
  }

  await sendNewSignupEmail({ email, userId });

  return NextResponse.json({ ok: true });
}
