import { NextResponse, type NextRequest } from "next/server";
import { checkPipelineHealth } from "@/lib/articles/pipeline-health";
import { sendMissedRunAlertEmail } from "@/lib/notifications/email";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Triggered daily by the Vercel cron in vercel.json, well after the
 * process-articles GitHub Action is expected to have run. Checks for a
 * recent heartbeat in pipeline_runs (written by every process-articles run,
 * success or failure) and emails an alert if one hasn't landed recently —
 * catching a silently-dropped cron (as happened on 2026-07-27) instead of
 * relying on someone noticing the story count looks stale.
 */
export async function GET(request: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("cron-secret");
  const providedSecret = authHeader?.replace(/^Bearer\s+/i, "") ?? cronHeader;

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await checkPipelineHealth();

  if (!status.healthy) {
    await sendMissedRunAlertEmail({
      lastRunAt: status.lastRunAt,
      hoursSinceLastRun: status.hoursSinceLastRun,
    });
  }

  return NextResponse.json(status);
}
