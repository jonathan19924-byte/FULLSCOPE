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
  removed: { title: string }[];
  totalStories: number;
}

export async function sendPipelineSummaryEmail(params: PipelineSummaryEmailParams): Promise<void> {
  const { added, removed, totalStories } = params;

  const addedHtml = added.length
    ? `<ul>${added.map((s) => `<li><strong>${escapeHtml(s.title)}</strong> — ${escapeHtml(s.category)}</li>`).join("")}</ul>`
    : "<p>None</p>";
  const removedHtml = removed.length
    ? `<ul>${removed.map((s) => `<li>${escapeHtml(s.title)}</li>`).join("")}</ul>`
    : "<p>None</p>";

  const html = `
    <h2>FullScope — daily story pipeline summary</h2>
    <p>Total stories now live: <strong>${totalStories}</strong></p>
    <h3>Added (${added.length})</h3>
    ${addedHtml}
    <h3>Removed (${removed.length})</h3>
    ${removedHtml}
  `.trim();

  await sendResendEmail(`FullScope: ${added.length} story added, ${removed.length} removed`, html);
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
}): Promise<void> {
  const { lastRunAt, hoursSinceLastRun } = params;

  const html = `
    <h2>⚠️ FullScope — daily story pipeline appears to have missed its run</h2>
    <p>${
      lastRunAt
        ? `Last recorded run: <strong>${escapeHtml(lastRunAt)}</strong> (${hoursSinceLastRun?.toFixed(1)} hours ago).`
        : "No run has ever been recorded."
    }</p>
    <p>Check the GitHub Actions run history for <code>process-articles.yml</code> — the daily schedule may have been delayed or dropped (this happened before, on 2026-07-27).</p>
  `.trim();

  await sendResendEmail("⚠️ FullScope: daily pipeline may have missed its run", html);
}
