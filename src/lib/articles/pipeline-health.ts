import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Shared by process-articles.ts (writes a heartbeat after every run) and
 * /api/cron/check-pipeline-health (reads the most recent one). Kept
 * separate from process-articles.ts so the health-check route doesn't need
 * to import the whole pipeline module just to read a timestamp.
 */
function createHealthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — set them in .env.local (see .env.local.example).",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Recorded at the end of every process-articles run, success or failure —
 * this is what lets the health check tell "ran today, found nothing to do"
 * apart from "the cron never fired at all" (they'd otherwise look
 * identical from the stories table alone). */
export async function recordPipelineHeartbeat(status: "success" | "error", detail: string): Promise<void> {
  try {
    const supabase = createHealthClient();
    const { error } = await supabase.from("pipeline_runs").insert({ job: "process-articles", status, detail });
    if (error) console.error("Error recording pipeline heartbeat:", error.message);
  } catch (err) {
    console.error("Error recording pipeline heartbeat:", err instanceof Error ? err.message : String(err));
  }
}

export interface PipelineHealthStatus {
  healthy: boolean;
  lastRunAt: string | null;
  hoursSinceLastRun: number | null;
}

/** A run is considered missing once it's older than this. The cron fires
 * once daily (13 7 * * * UTC); a healthy last-run age is a few hours at
 * most whenever this check itself runs, while a dropped cron means the
 * previous day's run, ~24h+ old. 20h cleanly separates the two without
 * false-triggering on ordinary run-time variance. */
const STALE_THRESHOLD_HOURS = 20;

export async function checkPipelineHealth(): Promise<PipelineHealthStatus> {
  const supabase = createHealthClient();
  const { data, error } = await supabase
    .from("pipeline_runs")
    .select("ran_at")
    .eq("job", "process-articles")
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Error reading pipeline_runs: ${error.message}`);

  if (!data) {
    return { healthy: false, lastRunAt: null, hoursSinceLastRun: null };
  }

  const hoursSinceLastRun = (Date.now() - new Date(data.ran_at).getTime()) / (1000 * 60 * 60);
  return {
    healthy: hoursSinceLastRun <= STALE_THRESHOLD_HOURS,
    lastRunAt: data.ran_at,
    hoursSinceLastRun,
  };
}
