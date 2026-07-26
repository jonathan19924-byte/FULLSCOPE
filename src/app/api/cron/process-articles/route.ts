import { NextResponse, type NextRequest } from "next/server";
import { processArticles } from "@/lib/articles/process-articles";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * NOT on the Vercel cron schedule (removed from vercel.json) — a full day's
 * clustering/story/post generation can take minutes, well past Vercel
 * Hobby's ~10s function limit, and got killed mid-run in testing. The daily
 * job now runs via .github/workflows/process-articles.yml instead, which has
 * no such time limit. This route is kept for manual/small-batch testing
 * (e.g. a backlog small enough to finish in time) — same CRON_SECRET
 * protection as /api/cron/fetch-rss.
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
