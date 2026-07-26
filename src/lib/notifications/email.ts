function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface PipelineSummaryEmailParams {
  added: { title: string; category: string }[];
  removed: { title: string }[];
  totalStories: number;
}

/**
 * Best-effort — never throws. A missing key/recipient or a Resend outage
 * shouldn't fail the pipeline run itself, just skip the notification.
 */
export async function sendPipelineSummaryEmail(params: PipelineSummaryEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFICATION_EMAIL;

  if (!apiKey || !to) {
    console.log("Skipping summary email — RESEND_API_KEY or NOTIFICATION_EMAIL not set.");
    return;
  }

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
        subject: `FullScope: ${added.length} story added, ${removed.length} removed`,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`Error sending summary email: ${res.status} ${text.slice(0, 300)}`);
      return;
    }

    console.log(`Summary email sent to ${to}`);
  } catch (err) {
    console.error("Error sending summary email:", err instanceof Error ? err.message : String(err));
  }
}
