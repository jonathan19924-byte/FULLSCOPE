function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Shared send path for every ops/notification email. Best-effort — never
 * throws. A missing key/recipient or a Resend outage shouldn't fail whatever
 * triggered the email, just skip the notification.
 */
async function sendResendEmail(subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFICATION_EMAIL;

  if (!apiKey || !to) {
    console.log("Skipping email — RESEND_API_KEY or NOTIFICATION_EMAIL not set.");
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "FullScope Pipeline <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`Error sending email: ${res.status} ${text.slice(0, 300)}`);
      return;
    }

    console.log(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error("Error sending email:", err instanceof Error ? err.message : String(err));
  }
}

export interface PipelineSummaryEmailParams {
  added: { title: string; category: string }[];
  updated: { title: string; note: string }[];
  removed: { title: string }[];
  totalStories: number;
}

export async function sendPipelineSummaryEmail(params: PipelineSummaryEmailParams): Promise<void> {
  const { added, updated, removed, totalStories } = params;

  const addedHtml = added.length
    ? `<ul>${added.map((s) => `<li><strong>${escapeHtml(s.title)}</strong> — ${escapeHtml(s.category)}</li>`).join("")}</ul>`
    : "<p>None</p>";
  const updatedHtml = updated.length
    ? `<ul>${updated.map((s) => `<li><strong>${escapeHtml(s.title)}</strong> — ${escapeHtml(s.note)}</li>`).join("")}</ul>`
    : "<p>None</p>";
  const removedHtml = removed.length
    ? `<ul>${removed.map((s) => `<li>${escapeHtml(s.title)}</li>`).join("")}</ul>`
    : "<p>None</p>";

  const html = `
    <h2>FullScope — daily story pipeline summary</h2>
    <p>Total stories now live: <strong>${totalStories}</strong></p>
    <h3>Added (${added.length})</h3>
    ${addedHtml}
    <h3>Updated with new coverage (${updated.length})</h3>
    ${updatedHtml}
    <h3>Removed (${removed.length})</h3>
    ${removedHtml}
  `.trim();

  await sendResendEmail(
    `FullScope: ${added.length} added, ${updated.length} updated, ${removed.length} removed`,
    html,
  );
}

/**
 * Fired by /api/cron/check-pipeline-health when the process-articles
 * pipeline hasn't recorded a heartbeat recently — i.e. the daily cron
 * silently didn't run at all, as opposed to running and legitimately
 * finding nothing to do. Distinct from sendPipelineSummaryEmail, which only
 * ever fires as part of a real run.
 */
export async function sendMissedRunAlertEmail(params: {
  lastRunAt: string | null;
  hoursSinceLastRun: number | null;
  retryTriggered: boolean;
  retryError?: string;
}): Promise<void> {
  const { lastRunAt, hoursSinceLastRun, retryTriggered, retryError } = params;

  const retryHtml = retryTriggered
    ? `<p>✅ Automatically triggered <code>process-articles.yml</code> to run now via GitHub's API — no action needed unless it fails again.</p>`
    : `<p>❌ Tried to automatically re-trigger <code>process-articles.yml</code>, but that failed too: <strong>${escapeHtml(
        retryError ?? "unknown error",
      )}</strong>. This needs manual attention.</p>`;

  const html = `
    <h2>⚠️ FullScope — daily story pipeline missed its run</h2>
    <p>${
      lastRunAt
        ? `Last recorded run: <strong>${escapeHtml(lastRunAt)}</strong> (${hoursSinceLastRun?.toFixed(1)} hours ago).`
        : "No run has ever been recorded."
    }</p>
    ${retryHtml}
  `.trim();

  await sendResendEmail("⚠️ FullScope: daily pipeline missed its run", html);
}

/** Fired by the new-signup Postgres trigger (via the /api/webhooks/new-signup
 * route) the moment someone creates an account — every profile row starts
 * 'pending', so this is the heads-up to go approve or reject them from the
 * dashboard rather than having to check in on it. */
export async function sendNewSignupEmail(params: { email: string; userId: string }): Promise<void> {
  const { email, userId } = params;

  const html = `
    <h2>FullScope — new sign-up awaiting approval</h2>
    <p><strong>${escapeHtml(email)}</strong> just created an account.</p>
    <p><a href="https://fullscope-dashboard.vercel.app">Open the dashboard</a> to approve or reject it.</p>
    <p><code>${escapeHtml(userId)}</code></p>
  `.trim();

  await sendResendEmail(`FullScope: new sign-up — ${email}`, html);
}

/** Fired by the moderation pass (folded into the every-2-hours trend-check
 * cron) when it hides one or more posts. Nothing is deleted — this is
 * purely a heads-up so a human can double-check and reverse a false
 * positive via the Supabase dashboard if needed. */
export async function sendModerationAlertEmail(
  flagged: { id: string; content: string; reason: string }[],
): Promise<void> {
  const itemsHtml = flagged
    .map(
      (f) =>
        `<li><strong>Reason:</strong> ${escapeHtml(f.reason)}<br/><strong>Post:</strong> ${escapeHtml(f.content)}<br/><code>${f.id}</code></li>`,
    )
    .join("");

  const html = `
    <h2>🚩 FullScope — ${flagged.length} reader post${flagged.length === 1 ? "" : "s"} auto-hidden by moderation</h2>
    <p>Hidden automatically, not deleted — reversible in the Supabase dashboard (community_posts table, is_hidden column) if any of these look like a false positive.</p>
    <ul>${itemsHtml}</ul>
  `.trim();

  await sendResendEmail(`🚩 FullScope: ${flagged.length} post(s) auto-hidden by moderation`, html);
}
