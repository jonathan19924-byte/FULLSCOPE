import { NextResponse, type NextRequest } from "next/server";
import { processArticles } from "@/lib/articles/process-articles";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Triggered daily by the Vercel cron in vercel.json (0 7 * * * — 7am UTC,
 * one hour after the RSS fetch cron). Same CRON_SECRET protection as
 * /api/cron/fetch-rss.
 */
export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("cron-secret");
  const providedSecret = authHeader?.replace(/^Bearer\s+/i, "") ?? cronHeader;

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processArticles();

  return NextResponse.json(result);
}
