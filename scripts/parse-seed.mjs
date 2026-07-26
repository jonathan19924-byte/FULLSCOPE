/**
 * One-time transcription tool: reads fullscope-seed-july23.md and produces
 * src/lib/data/seed-stories.json and src/lib/data/seed-standalone-posts.json.
 * Parsing (not inventing) content — every field here is a direct extraction
 * of the seed markdown's own text.
 *
 * Run with: node scripts/parse-seed.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(root, "fullscope-seed-july23.md"), "utf-8");

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Returns the LAST match for a single-line field. Several stories in this
 * file list a field twice (an initial value, then a corrected one right
 * before the summary) — the later one is always the one that matches the
 * authoritative "Final Instructions" list at the end of the file. */
function field(block, name) {
  const re = new RegExp(`- \\*\\*${name}:\\*\\* (.+)`, "g");
  const matches = [...block.matchAll(re)];
  return matches.length ? matches[matches.length - 1][1].trim() : "";
}

function listField(block, name) {
  // List items are indented two spaces ("  - item"); a field marker line
  // ("- **next_field:**") has no leading indent, so this stops there.
  const re = new RegExp(`- \\*\\*${name}:\\*\\*\\s*\\n((?:  - .+\\n?)+)`);
  const m = block.match(re);
  if (!m) return [];
  return m[1]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).trim());
}

function parseStoryPosts(block) {
  const lines = block.split("\n");
  const posts = [];
  for (const line of lines) {
    const m = line.match(/^\|\s*(.+?)\s*\|\s*([AB])\s*\|\s*(.+?)\s*\|$/);
    if (!m) continue;
    if (m[1] === "display_name") continue; // header row
    posts.push({ displayName: m[1].trim(), perspective: m[2], content: m[3].trim() });
  }
  return posts;
}

// The "Final Instructions" section is the authoritative source for each
// story's category — a couple of stories list a wrong/stale category earlier
// in their own block (with a "Note to Claude Code" correcting it), so we
// trust this list over the story body.
const finalInstructionsMatch = src.match(/## Final Instructions([\s\S]*)/);
const categoryByNumber = new Map();
if (finalInstructionsMatch) {
  const re = /^(\d+)\.\s+(\w+):/gm;
  for (const m of finalInstructionsMatch[1].matchAll(re)) {
    categoryByNumber.set(Number(m[1]), m[2]);
  }
}

const headerRe = /^## Story (\d+) — ([A-Za-z]+)(.*)$/gm;
const headers = [...src.matchAll(headerRe)];

const blocksByNumber = new Map();
for (let i = 0; i < headers.length; i++) {
  const h = headers[i];
  const num = Number(h[1]);
  const start = h.index + h[0].length;
  const end = i + 1 < headers.length ? headers[i + 1].index : src.indexOf("## STANDALONE POSTS");
  blocksByNumber.set(num, src.slice(start, end));
}

const storyNumbers = [...blocksByNumber.keys()].sort((a, b) => a - b);

// Stories are listed oldest-first in the "Final Instructions" order. The seed
// data doesn't specify exact publish timestamps, so we stagger them ending at
// "now" (the most recent story lands a few hours ago) and going backward in
// time for earlier stories — never into the future, regardless of what day
// this script happens to be run on.
const STORY_INTERVAL_HOURS = 4;

const stories = storyNumbers.map((num, idx) => {
  const block = blocksByNumber.get(num);
  const category = categoryByNumber.get(num) || field(block, "category");
  const title = field(block, "title");
  const summary = field(block, "summary");
  const perspectiveAName = field(block, "perspective_a_name");
  const perspectiveA = field(block, "perspective_a");
  const perspectiveAClaims = listField(block, "perspective_a_claims");
  const perspectiveBName = field(block, "perspective_b_name");
  const perspectiveB = field(block, "perspective_b");
  const perspectiveBClaims = listField(block, "perspective_b_claims");
  const whatHappened = field(block, "what_happened");
  const timelineItems = listField(block, "what_happened_timeline");
  const keyDifferencesCause = field(block, "key_differences_cause");
  const keyDifferencesImpact = field(block, "key_differences_impact");
  const sourcesRaw = field(block, "sources");
  const sources = sourcesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((publisher) => ({ publisher, sourceType: "News" }));
  const posts = parseStoryPosts(block);

  const wordCount = (whatHappened + " " + summary + " " + perspectiveA + " " + perspectiveB).split(/\s+/).length;
  const readingTimeMinutes = Math.max(2, Math.round(wordCount / 200));

  // Oldest story published first, newest (last in the list) most recent —
  // counting backward from now so nothing is ever dated in the future.
  const hoursAgo = (storyNumbers.length - 1 - idx) * STORY_INTERVAL_HOURS;
  const publishedAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

  return {
    id: `story-${num}`,
    slug: slugify(title),
    title,
    category,
    summary,
    whatHappened,
    // Every timeline entry is attributed reporting from named outlets, not
    // independently verified by FullScope — labelled "reported" accordingly.
    timeline: timelineItems.map((text) => ({ text, confidence: "reported" })),
    perspectiveA: { name: perspectiveAName, summary: perspectiveA, claims: perspectiveAClaims },
    perspectiveB: { name: perspectiveBName, summary: perspectiveB, claims: perspectiveBClaims },
    keyDifferencesCause,
    keyDifferencesImpact,
    sources,
    entities: { people: [], companies: [], countries: [] },
    publishedAt,
    readingTimeMinutes,
    posts: posts.map((p, i) => ({
      id: `story-${num}-post-${i + 1}`,
      storyId: `story-${num}`,
      displayName: p.displayName,
      perspective: p.perspective,
      content: p.content,
      isGenerated: true,
      likeCount: 0,
      replyCount: 0,
      createdAt: publishedAt,
    })),
  };
});

// Standalone posts: freestanding, not tied to any story (story_id: null).
const standaloneMatch = src.match(/## STANDALONE POSTS([\s\S]*?)## Final Instructions/);
const standalonePosts = [];
if (standaloneMatch) {
  const lines = standaloneMatch[1].split("\n");
  const rows = [];
  for (const line of lines) {
    const m = line.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|$/);
    if (!m) continue;
    if (m[1] === "display_name") continue; // header row
    if (/^-+$/.test(m[1].trim())) continue; // separator row
    rows.push(m);
  }
  // These are the most recent items in the feed — reactions to everything
  // above — spaced a few minutes apart, most recent one landing just now.
  let i = 0;
  for (const m of rows) {
    const minutesAgo = (rows.length - 1 - i) * 12;
    const createdAt = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
    standalonePosts.push({
      id: `standalone-post-${i + 1}`,
      displayName: m[1].trim(),
      content: m[2].trim(),
      isGenerated: true,
      likeCount: 0,
      replyCount: 0,
      createdAt,
    });
    i++;
  }
}

const outDir = path.join(root, "src", "lib", "data");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "seed-stories.json"), JSON.stringify(stories, null, 2) + "\n");
fs.writeFileSync(
  path.join(outDir, "seed-standalone-posts.json"),
  JSON.stringify(standalonePosts, null, 2) + "\n",
);

const totalPosts = stories.reduce((sum, s) => sum + s.posts.length, 0);
console.log(
  `Parsed ${stories.length} stories, ${totalPosts} story posts, and ${standalonePosts.length} standalone posts.`,
);
for (const s of stories) {
  const missing = [];
  if (!s.title) missing.push("title");
  if (!s.category) missing.push("category");
  if (!s.summary) missing.push("summary");
  if (!s.whatHappened) missing.push("whatHappened");
  if (!s.perspectiveA.name) missing.push("perspectiveA");
  if (!s.perspectiveB.name) missing.push("perspectiveB");
  if (s.timeline.length === 0) missing.push("timeline");
  if (s.posts.length === 0) missing.push("posts");
  if (missing.length) console.warn(`  ! ${s.id} (${s.title || "untitled"}) missing: ${missing.join(", ")}`);
}
