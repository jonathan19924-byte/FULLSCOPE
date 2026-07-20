/**
 * One-time transcription tool: reads fullscope-seed-april20.md and produces
 * src/lib/data/seed-stories.json. Parsing (not inventing) content — every
 * field here is a direct extraction of the seed markdown's own text.
 *
 * Run with: node scripts/parse-seed.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(root, "fullscope-seed-april20.md"), "utf-8");

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function field(block, name) {
  const re = new RegExp(`- \\*\\*${name}:\\*\\* (.+)`);
  const m = block.match(re);
  return m ? m[1].trim() : "";
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

function parsePosts(block) {
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

// Split into story sections. Story 12 appears twice (a discarded duplicate,
// then an explicit "(replacement)" block) — the seed file's own note says to
// use the replacement, so we grab that heading specifically for story 12.
const headerRe = /^## Story (\d+) — ([A-Za-z]+)(.*)$/gm;
const headers = [...src.matchAll(headerRe)];

const blocksByNumber = new Map();
for (let i = 0; i < headers.length; i++) {
  const h = headers[i];
  const num = Number(h[1]);
  const isReplacement = /replacement/i.test(h[3] || "");
  const start = h.index + h[0].length;
  const end = i + 1 < headers.length ? headers[i + 1].index : src.indexOf("## Final Instructions");
  const block = src.slice(start, end);

  if (num === 12) {
    if (isReplacement) blocksByNumber.set(num, { category: h[2], block });
  } else {
    blocksByNumber.set(num, { category: h[2], block });
  }
}

const storyNumbers = [...blocksByNumber.keys()].sort((a, b) => a - b);

// Stories are listed oldest-first in the "Final Instructions" order; we stagger
// publish dates across April 2026 (the seed file's own dateline) so Home/Search
// sorting and "last updated" have something real to work with. The seed data
// itself does not specify exact publish timestamps per story.
const baseDate = new Date("2026-04-20T09:00:00Z");

const stories = storyNumbers.map((num, idx) => {
  const { category, block } = blocksByNumber.get(num);
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
  const posts = parsePosts(block);

  const wordCount = (whatHappened + " " + summary + " " + perspectiveA + " " + perspectiveB).split(/\s+/).length;
  const readingTimeMinutes = Math.max(2, Math.round(wordCount / 200));

  // Oldest story published first, newest (story 15) most recent — one day apart.
  const publishedAt = new Date(baseDate.getTime() + idx * 24 * 60 * 60 * 1000).toISOString();

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

const outDir = path.join(root, "src", "lib", "data");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "seed-stories.json"), JSON.stringify(stories, null, 2) + "\n");

const totalPosts = stories.reduce((sum, s) => sum + s.posts.length, 0);
console.log(`Parsed ${stories.length} stories and ${totalPosts} posts -> src/lib/data/seed-stories.json`);
for (const s of stories) {
  const missing = [];
  if (!s.title) missing.push("title");
  if (!s.summary) missing.push("summary");
  if (!s.whatHappened) missing.push("whatHappened");
  if (!s.perspectiveA.name) missing.push("perspectiveA");
  if (!s.perspectiveB.name) missing.push("perspectiveB");
  if (s.timeline.length === 0) missing.push("timeline");
  if (s.posts.length === 0) missing.push("posts");
  if (missing.length) console.warn(`  ! ${s.id} (${s.title || "untitled"}) missing: ${missing.join(", ")}`);
}
