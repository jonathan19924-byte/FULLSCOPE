import { NextResponse, type NextRequest } from "next/server";
import { fetchAllFeeds } from "@/lib/rss/fetch-rss";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Triggered daily by the Vercel cron in vercel.json (0 6 * * * — 6am UTC).
 * Vercel sends `Authorization: Bearer $CRON_SECRET` on its own cron
 * invocations; a raw `cron-secret` header is also accepted for manual
 * testing (e.g. curl). Either must match the CRON_SECRET env var.
 */
export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("cron-secret");
  const providedSecret = authHeader?.replace(/^Bearer\s+/i, "") ?? cronHeader;

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { results, totalSaved } = await fetchAllFeeds();

  return NextResponse.json({ totalSaved, results });
}
