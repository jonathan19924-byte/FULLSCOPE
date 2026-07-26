const CLAUDE_MODEL = "claude-sonnet-5";

/**
 * "claude-sonnet-4-6" (as originally specified) isn't a real/current model
 * id — using claude-sonnet-5, the current mid-tier model, instead.
 */
export async function callClaude(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY — set it in .env.local (see .env.local.example).");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      // This model uses extended thinking by default, which can consume the
      // entire max_tokens budget before producing any output text — these
      // are mechanical JSON-formatting tasks that don't need reasoning.
      thinking: { type: "disabled" },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Claude API error ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((block) => block.type === "text")?.text;

  if (typeof text !== "string") {
    throw new Error("Unexpected Claude response shape (no text block found)");
  }

  return text;
}

/** Claude is asked to "return ONLY valid JSON" but sometimes wraps it in a
 * ```json fence anyway — this strips that before parsing. */
export function parseClaudeJson<T>(raw: string): T {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(stripped) as T;
}
