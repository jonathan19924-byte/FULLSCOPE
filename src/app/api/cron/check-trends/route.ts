import { NextResponse, type NextRequest } from "next/server";
import { checkStoryTrends } from "@/lib/articles/trend-detection";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Not on the Vercel cron schedule — Hobby plan only supports daily cron
 * frequency, and this needs to run every couple of hours. The real schedule
 * lives in .github/workflows/check-trends.yml, same pattern as
 * process-articles. This route is kept for manual/local testing.
 */
export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("cron-secret");
  const providedSecret = authHeader?.replace(/^Bearer\s+/i, "") ?? cronHeader;

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkStoryTrends();

  return NextResponse.json(result);
}
