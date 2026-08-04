import "server-only";
import { callClaudeVision } from "@/lib/articles/claude";

const VISION_QUESTION =
  "Does this photograph contain any of the following: graphic violence or gore, nudity or sexual " +
  "content, hate symbols or hateful imagery, or content that would be inappropriate to show publicly " +
  "on a general-audience news app? Answer with exactly one word: yes or no.";

/**
 * Checks a just-uploaded post photo before it's shown to anyone else. Unlike
 * findStoryImage's isImageClean (which vets already-curated stock photos and
 * fails "clean" on error), this vets an arbitrary user upload with no prior
 * vetting at all — so it fails CLOSED (rejected) on any error, since an
 * unchecked user photo going live by default is the wrong failure mode here.
 */
export async function isPostPhotoClean(imageUrl: string): Promise<boolean> {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return false;

    const mediaType = imgRes.headers.get("content-type") ?? "image/jpeg";
    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const answer = await callClaudeVision(base64, mediaType, VISION_QUESTION, 10);
    return answer.trim().toLowerCase().startsWith("no");
  } catch (err) {
    console.error("Error checking post photo:", err instanceof Error ? err.message : String(err));
    return false;
  }
}
