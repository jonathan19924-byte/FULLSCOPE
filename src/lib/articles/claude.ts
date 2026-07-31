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

/**
 * Vision variant of callClaude — sends an actual image (base64) alongside a
 * text question instead of a plain text prompt. Used to inspect candidate
 * stock photos directly rather than relying on a search API's own text
 * description of them (see findStoryImage in pexels.ts for why: a photo can
 * carry a legible sign/banner making a one-sided claim regardless of how the
 * stock library describes it in words).
 */
export async function callClaudeVision(
  imageBase64: string,
  mediaType: string,
  question: string,
  maxTokens: number,
): Promise<string> {
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
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: question },
          ],
        },
      ],
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

const HEBREW_LETTER = /[֐-׿]/;

/** A `"` immediately followed by `,` is ambiguous on its own — Hebrew (and
 * English) prose routinely has a quoted phrase end right before a natural
 * sentence-comma (e.g. `...לשלוח אותם ל"צד האדום", וכי...`), which looks
 * identical, locally, to a real JSON value ending before the next key or
 * array element. The disambiguator is what's on the FAR side of the comma:
 * a real object separator is followed by `"someKey":`, and a real array
 * separator is followed by another element ending in `,` or `]` — prose
 * just continues with more plain text instead. This confirms one of those
 * shapes before trusting the comma. */
function commaIsRealSeparator(raw: string, commaIndex: number): boolean {
  let k = commaIndex + 1;
  while (k < raw.length && /\s/.test(raw[k])) k++;
  if (raw[k] !== '"') return false;

  let m = k + 1;
  while (m < raw.length && raw[m] !== '"') {
    if (raw[m] === "\\") m++;
    m++;
  }
  if (m >= raw.length) return false;

  let p = m + 1;
  while (p < raw.length && /\s/.test(raw[p])) p++;
  return raw[p] === ":" || raw[p] === "," || raw[p] === "]";
}

/** Repairs stray unescaped `"` characters inside JSON string values —
 * observed with Hebrew abbreviations that use gershayim (״, U+05F4, visually
 * similar to a straight quote but a distinct character, e.g. "בג"ץ") and,
 * separately, with quoted speech inside a sentence (e.g. a soldier quoted as
 * saying "לצד האדום"). Both cases produce a plain ASCII `"` mid-string, which
 * looks like the string terminator to a JSON parser and breaks parsing.
 *
 * Rather than pattern-matching specific cases (fragile — a quote can be
 * adjacent to a Hebrew letter, or separated by spaces around a whole quoted
 * phrase, or both), this walks the raw text tracking string-open/closed
 * state and, on every `"` encountered while already inside a string, checks
 * whether what follows is a valid JSON continuation. `:`, `}`, `]`, and
 * end-of-input are unambiguous. `,` needs the extra check above since prose
 * commas are common. If it's not a real terminator, it's a stray quote that
 * needs repairing — as gershayim if it sits directly between two Hebrew
 * letters (the common abbreviation case, and the nicer-looking fix),
 * otherwise as an escaped `\"` (preserves a quoted phrase's punctuation). */
function repairStrayQuotes(raw: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];

    if (!inString) {
      result += char;
      if (char === '"') inString = true;
      continue;
    }

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escaped = true;
      continue;
    }

    if (char !== '"') {
      result += char;
      continue;
    }

    // We're inside a string and hit an unescaped quote — decide whether
    // it's the real closing quote or a stray one.
    let j = i + 1;
    while (j < raw.length && /\s/.test(raw[j])) j++;
    const next = raw[j];
    const isRealTerminator =
      next === undefined ||
      next === ":" ||
      next === "}" ||
      next === "]" ||
      (next === "," && commaIsRealSeparator(raw, j));

    if (isRealTerminator) {
      result += char;
      inString = false;
      continue;
    }

    const prevChar = raw[i - 1];
    const nextChar = raw[i + 1];
    if (prevChar && nextChar && HEBREW_LETTER.test(prevChar) && HEBREW_LETTER.test(nextChar)) {
      result += "״";
    } else {
      result += '\\"';
    }
  }

  return result;
}

/** Claude is asked to "return ONLY valid JSON" but sometimes wraps it in a
 * ```json fence anyway — this strips that before parsing. */
export function parseClaudeJson<T>(raw: string): T {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(repairStrayQuotes(stripped)) as T;
}
