import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { callClaude, parseClaudeJson } from "./claude";
import { sendModerationAlertEmail } from "../notifications/email";

function createClient() {
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

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") return JSON.stringify(err);
  return String(err);
}

// One Claude call per batch keeps this cheap regardless of how many
// posts/comments accumulate between runs.
const BATCH_SIZE = 25;

interface UnmoderatedItem {
  id: string;
  content: string;
}

interface ModerationVerdict {
  id: string;
  flagged: boolean;
  reason: string;
}

function buildModerationPrompt(kind: "post" | "comment", items: UnmoderatedItem[]): string {
  const list = items.map((p) => `[${p.id}] ${p.content}`).join("\n");
  const label = kind === "comment" ? "reader comment" : "reader post";

  return `You are a content moderator for a news discussion platform. Review each ${label} below and flag ONLY genuine policy violations — harassment, hate speech, threats/incitement to violence, doxxing, illegal content, or spam/scams. Do NOT flag ${label}s just for being rude, one-sided, politically opinionated, or unpleasant to read — strong opinions on news stories are the entire point of this platform and must not be flagged.

${kind === "comment" ? "Comments" : "Posts"}:
${list}

Return ONLY valid JSON in this exact structure:
{
  "verdicts": [
    { "id": "string (the bracketed id above)", "flagged": boolean, "reason": "short reason if flagged, empty string if not" }
  ]
}
Include one verdict per ${label} listed above, in any order.`;
}

export interface ModerationResult {
  checked: number;
  flagged: number;
  errors: number;
}

/** Shared core for moderateNewPosts/moderateNewComments — identical scan
 * over either community_posts or community_post_comments, both of which
 * carry the same three moderation columns (moderation_checked_at,
 * is_hidden, flagged_reason). Flagged items are hidden immediately rather
 * than left up pending manual review, and an email goes out so a human can
 * look — reversible via the Supabase dashboard if it's a false positive,
 * since nothing is deleted. */
async function moderateTable(
  table: "community_posts" | "community_post_comments",
  kind: "post" | "comment",
): Promise<ModerationResult> {
  const supabase = createClient();
  let checked = 0;
  let flagged = 0;
  let errors = 0;
  const flaggedForEmail: { id: string; content: string; reason: string }[] = [];

  const { data: items, error: fetchError } = await supabase
    .from(table)
    .select("id, content")
    .is("moderation_checked_at", null)
    .limit(500);

  if (fetchError) {
    console.error(`Error fetching unmoderated ${kind}s:`, fetchError.message);
    return { checked, flagged, errors: 1 };
  }
  if (!items || items.length === 0) return { checked, flagged, errors };

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE) as UnmoderatedItem[];

    try {
      const raw = await callClaude(buildModerationPrompt(kind, batch), 1000);
      const { verdicts } = parseClaudeJson<{ verdicts: ModerationVerdict[] }>(raw);

      const now = new Date().toISOString();
      const flaggedIds: string[] = [];

      for (const v of verdicts ?? []) {
        if (!batch.some((item) => item.id === v.id)) continue; // ignore any hallucinated id
        if (v.flagged) {
          flaggedIds.push(v.id);
          const item = batch.find((i) => i.id === v.id)!;
          flaggedForEmail.push({ id: v.id, content: item.content, reason: v.reason });
        }
      }

      // Mark the whole batch checked regardless of verdict.
      const { error: checkedError } = await supabase
        .from(table)
        .update({ moderation_checked_at: now })
        .in(
          "id",
          batch.map((item) => item.id),
        );
      if (checkedError) throw new Error(`Error marking ${kind}s checked: ${checkedError.message}`);

      if (flaggedIds.length > 0) {
        const { error: flagError } = await supabase.from(table).update({ is_hidden: true }).in("id", flaggedIds);
        if (flagError) throw new Error(`Error hiding flagged ${kind}s: ${flagError.message}`);

        // Reasons differ per item, so set them individually.
        for (const v of verdicts ?? []) {
          if (!v.flagged) continue;
          await supabase.from(table).update({ flagged_reason: v.reason }).eq("id", v.id);
        }
      }

      checked += batch.length;
      flagged += flaggedIds.length;
    } catch (err) {
      console.error(`Error moderating ${kind} batch:`, describeError(err));
      errors++;
    }
  }

  if (flaggedForEmail.length > 0) {
    await sendModerationAlertEmail(flaggedForEmail, kind);
  }

  return { checked, flagged, errors };
}

/** Scans real reader posts that haven't been moderation-checked yet. */
export async function moderateNewPosts(): Promise<ModerationResult> {
  return moderateTable("community_posts", "post");
}

/** Scans real reader comments that haven't been moderation-checked yet —
 * same mechanism as moderateNewPosts, see moderateTable. */
export async function moderateNewComments(): Promise<ModerationResult> {
  return moderateTable("community_post_comments", "comment");
}
