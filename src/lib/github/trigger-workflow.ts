const REPO_OWNER = "jonathan19924-byte";
const REPO_NAME = "FULLSCOPE";

/**
 * process-articles.yml's own `schedule:` trigger has failed to fire on its
 * own twice in a row (2026-07-27, 2026-07-28) across two different cron
 * values, while a sibling workflow in the same repo fires reliably on its
 * schedule — so GitHub's own scheduler can't be trusted as the sole
 * mechanism. This lets the (separately reliable) Vercel-cron-driven health
 * check actively re-trigger the workflow via GitHub's API instead of just
 * emailing about the miss. Requires a GITHUB_ACTIONS_PAT with
 * Actions: read-and-write on this repo.
 */
export async function triggerProcessArticlesWorkflow(): Promise<{ triggered: boolean; error?: string }> {
  const pat = process.env.GITHUB_ACTIONS_PAT;
  if (!pat) {
    return { triggered: false, error: "Missing GITHUB_ACTIONS_PAT" };
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/process-articles.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { triggered: false, error: `GitHub API error ${res.status}: ${text.slice(0, 300)}` };
    }

    return { triggered: true };
  } catch (err) {
    return { triggered: false, error: err instanceof Error ? err.message : String(err) };
  }
}
