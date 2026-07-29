# Content Pipeline — Design Notes

*This is a working design/rationale document for FullScope's content-generation pipeline — separate from `PRD.md`, which describes what's built. `PRD.md` answers "what does the app do"; this answers "why does the pipeline work this way, what tradeoffs did we make, and what's still unresolved." Meant to be updated every time we touch content generation, so a future session (or a future you) doesn't have to re-derive reasoning that already happened once.*

*Last updated: 2026-07-29.*

---

## 1. Core editorial philosophy

Everything else in this document is downstream of a small number of hard rules. When in doubt about a future change, check it against these first.

1. **A story needs 2+ independent sources before it exists at all.** Enforced at clustering (`buildClusteringPrompt`) — a cluster with fewer than 2 distinct-source articles is dropped before it ever reaches generation. This is a corroboration bar, not an editorial-fit bar (see #2).
2. **A story needs a genuine two-sided dispute, not just corroboration.** Added 2026-07-29 (see §5, Decision Log). Two outlets reporting the same arrest doesn't mean there are "two sides" to the arrest. This is a *separate* gate from #1 — a story can pass the source-count bar and still fail this one.
3. **Perspectives are named by the argument, not the tribe making it.** "Security-first response" vs. "restraint and de-escalation," never "the right" vs. "the left," a party name, or a demographic label. This is the actual neutrality mechanism — a group label is inherently more loaded than an argument label, and inconsistent naming (one side by argument, one by identity) reads as biased even when the underlying content isn't.
4. **The perspective axis is locale-aware, not a fixed template.** English-mode prompts still default to left/progressive vs. right/conservative (a reasonable fit for US news). Hebrew mode explicitly does *not* force that — it lets the model pick whichever real axis divides people on *this* story: security vs. rights, religious vs. secular, coalition vs. opposition, hawkish vs. dovish, etc. Israeli politics doesn't collapse onto a US-style binary, and forcing one would misrepresent real disagreements.
5. **Stories are living, not static.** New coverage that's a development of an existing story gets folded into it (timeline entry, merged sources, possible revival from archive) instead of spawning a duplicate. A reader-trend needs 2+ *distinct* users independently making the same point before it's folded in — never a single opinion, no matter how many times one person repeats it.
6. **Moderation is for abuse, not disagreement.** The moderation pass hides harassment, threats, doxxing, spam — explicitly never a strongly-worded opinion or a one-sided take. That's supposed to happen here; suppressing it would defeat the point of the community layer.
7. **When a pipeline judgment call is uncertain, default to the less destructive option.** The coverage-merge check defaults to "new story" rather than "fold into existing" on any doubt — an incorrect merge corrupts a real story's content, while an incorrect "new" just creates an extra story the existing dedup pass can still catch later. Same asymmetry logic should apply to future judgment calls added to the pipeline.

---

## 2. Pipeline stages, in order, with the reasoning behind each

### Stage 1 — Fetch (`src/lib/rss/fetch-rss.ts`)
Pulls RSS from ~35 Hebrew/Israeli sources (or ~31 English sources in English mode) into `raw_articles`, tagged with a `source_lean` for later use. Runs on Vercel cron (daily) because it's fast and fits Vercel Hobby's serverless timeout — unlike the heavier stages below.

### Stage 2 — Cluster (`buildClusteringPrompt` in `process-articles.ts`)
Groups same-event articles by topic. Two gates happen here, in order:
1. **Source-count gate**: drop any cluster with fewer than 2 distinct-source articles (rule #1 above).
2. **Genuine-dispute gate** (added 2026-07-29): drop any cluster that's a routine incident report — an arrest, a traffic accident, someone hospitalized, a missing-person case, a routine indictment — where there's a clear outcome and no real controversy. Rejected clusters have their source articles marked `processed` immediately (same as the source-count rejection path) so they aren't reconsidered — and rejected again — every subsequent run.

Both gates are boolean judgment calls made by the same clustering prompt call (no extra API cost) — see §4 for the exact wording and §5 for why this was added.

Clusters are then sorted by size (most-corroborated first) and capped at `MAX_CLUSTERS_PER_RUN` (currently 10) so a single run's duration stays predictable regardless of backlog size — see the 2026-07-28 timeout incident in the git history (`cabda00`, `23d58ea`) for why this cap exists. Anything cut off by the cap just rolls into the next run (every 3 hours), since rejected/uncapped articles simply stay `processed: false`.

### Stage 3 — Coverage-update check (`findRelatedStory` / `applyCoverageUpdate`)
Before generating a *new* story for a cluster, check whether it's actually a development of an existing story (live or archived) in the same category. If so: append a timeline entry, merge in new sources, extend `published_at`, revive from archive if needed, log a `coverage`-type `story_updates` entry — no new story row. Biased toward "new" on any doubt (rule #7). Candidates are capped at 15 (10 live + 5 archived) to keep the prompt small and cheap.

### Stage 4 — Story + post generation (`buildStoryPrompt`, `buildPostsPrompt`)
Only reached if a cluster passed both clustering gates and wasn't claimed by the coverage-update check. Generates: title, summary, what-happened, timeline, two named perspectives (rules #3, #4), why-they-differ, sources, image keywords (always English, since Pexels' index doesn't understand Hebrew — see the bathroom-photo incident in the git history that motivated this), then 10 reaction posts split unevenly across the two perspectives.

**Known open issue**: `summary` (2 sentences) and `what_happened` (3-4 sentences) are two separate prompt fields both asking for "a neutral summary of what happened" — they routinely come back near-identical. The 2026-07-29 fix removed the *redundant on-page display* (the story hero no longer shows `summary` right above "What happened"), but the underlying generation prompt still produces overlapping content — `summary` still does real work as the card-teaser text across the app, so it can't just be deleted. If this comes up again: the fix is tightening the *prompts* so `summary` is explicitly a punchy teaser/hook (optimized for a card, not a narrative) and `what_happened` is explicitly the fuller account — not just asking for the same thing at two lengths.

### Stage 5 — Moderation (`moderateNewPosts`)
Runs before trend detection (so a flagged post can't get folded into a story in the same pass). Batches 25 unmoderated `community_posts` through Claude, hides genuine policy violations (rule #6), emails an alert either way.

### Stage 6 — Trend detection (`checkStoryTrends` / `applyTrend`)
Groups uncredited, non-hidden community posts by related story; only considers a story if ≥2 *distinct* `user_id`s made posts about it (re-verified server-side, not trusted from the prompt — rule #5). Folds the point into a claim or the why-they-differ text, credits the contributing posts, logs a `trend`-type `story_updates` entry.

### Stage 7 — Dedup (`dedupeStories`)
Runs every invocation regardless of whether new stories were generated, since duplicates can exist from past runs. Compares all *live* stories against each other for same-real-world-event duplicates (distinct from the coverage-update check, which compares *new* coverage against the existing body — see the code comment on `buildRelatedStoryPrompt` for the exact distinction). Archives (not deletes) the losing duplicates, keeping the most-recently-generated one as the survivor, logs a `merge`-type `story_updates` entry.

### Stage 8 — Cap enforcement + archiving
Hard backstop trimming the live story count to `MAX_STORIES` (60) if anything pushed it over. Archives rather than deletes (2026-07-29, `a606fb4`) — posts, likes, and reader contributions all stay intact, and an archived story can be revived by Stage 3 if new coverage on it shows up later.

### Stage 9 — Image backfill (`backfillMissingImages`)
Best-effort, runs concurrently (parallelized 2026-07-28 after it was found to be a real contributor to a pipeline timeout — see `cabda00`). Derives English image keywords via a small Claude call, searches Pexels, falls back to a category icon if nothing's found — never blocks story generation.

---

## 3. The two distinct "is this the same story" checks — don't conflate them

There are two separate mechanisms in this pipeline that both ask some version of "is this the same as something else," and it's easy to confuse them:

| | Coverage-update check (Stage 3) | Dedup check (Stage 7) |
|---|---|---|
| Compares | New cluster vs. existing stories (live + archived) | Live stories vs. each other |
| Runs | Once per new cluster, before generation | Once per invocation, over everything |
| Answers | "Is this new reporting a development of an existing story?" | "Did we accidentally generate two stories for the same event?" |
| On match | Folds into existing story, no new row | Archives the newer/duplicate, keeps one survivor |
| Logged as | `story_updates` type `coverage` | `story_updates` type `merge` |

They're complementary, not redundant: the coverage-update check prevents *new* duplicates from being created; dedup cleans up duplicates that slip through anyway (e.g., two clusters from the same run that were similar enough to both look "new" but weren't caught by the coverage check against each other, since it only checks against stories that already exist in the DB, not sibling clusters from the same batch).

---

## 4. Key prompt design decisions (exact current wording lives in `process-articles.ts`)

- **Stance-based perspective naming** (rule #3) is enforced with an explicit instruction (`nameNeutrality` in `buildStoryPrompt`) requiring both sides be phrased with the same register and specificity, precisely because an asymmetric mix (one side named by argument, one by identity) was identified as reading as biased even when the content wasn't.
- **Locale-aware axis selection** (rule #4): the Hebrew-mode prompt explicitly lists example axes (security-first vs. rights-first, religious vs. secular, coalition vs. opposition, hawkish vs. dovish) as *illustrative, not exhaustive* — the instruction is "pick whatever genuinely fits," not "pick from this list."
- **The genuine-dispute gate** (added 2026-07-29, rule #2) is phrased as a binary classification with explicit positive and negative examples in the prompt itself (policy debate / contested decision / controversial use of force / disputed ruling vs. arrest / traffic accident / hospitalization / missing-person case / routine indictment) rather than an abstract instruction — concrete examples were chosen because "is this controversial" is a fuzzier judgment than "are there 2 sources," and under-specifying it risked either over-filtering (rejecting real disputes that happen to involve police/courts) or under-filtering (the original problem).
- **Image keywords are always requested in English**, regardless of locale, because Pexels' search index doesn't meaningfully understand Hebrew — this was learned the hard way (a Hebrew-language search for a legal-ruling story returned an unrelated bathroom photo).

---

## 5. Decision log

Newest first. Each entry: what changed, and the concrete thing that motivated it (not just "improved X").

- **2026-07-29** — Added the genuine-dispute gate at clustering (rule #2). Motivated by direct observation of the live feed: routine crime-blotter stories (a body found, a theft arrest, a missing-person case, a snake bite hospitalization) were being forced into the two-perspective format with no real dispute to represent, producing thin or manufactured-feeling "sides." The fix is at the clustering stage rather than the generation stage, so a routine report never reaches story generation at all instead of generation trying (and failing) to invent a dispute.
- **2026-07-29** (`a606fb4`, `00b432f`) — Stories removed from the feed are archived, not deleted; new coverage can revive an archived story instead of only ever creating new ones. Motivated by wanting evicted/merged stories to not just vanish, and by the observation that "this is actually the same ongoing situation, just interrupted" is a real, common case (see the Iran/Hormuz and garbage-truck-fire test cases used to verify this).
- **2026-07-28** (`1711b5a`) — "Trending now" ranks by 24h post velocity instead of all-time post count, so a story's trending rank fades as engagement cools instead of staying pinned by an old burst forever.
- **2026-07-28** (`536f18a`) — Added post rate limiting, automated moderation, and signup CAPTCHA — the community layer became a real abuse surface once real accounts and real posts existed.
- **2026-07-28** (`32b033c`) — Reader posts can shape story content when a genuine trend emerges (rule #5), with the 2-distinct-user minimum enforced server-side rather than trusted from the Claude response, specifically to prevent one persistent user from single-handedly editing a story by repeating themselves.
- **2026-07-27** (`667cb09`) — Switched perspective naming from group/identity labels to stance/argument labels (rule #3) — this is the single highest-leverage neutrality decision in the whole prompt design.
- **2026-07-26** (`373531f`, `a2a03d0`) — Reversible Hebrew/RTL pivot: `LOCALE` toggle, Israeli source list, RTL layout, English seed data gated off in Hebrew mode. Chosen specifically as a config toggle rather than a rewrite so the English/international version underneath stays intact for a possible return to it later.
- **2026-07-26** (`dcef7a7`) — Raised the story cap to 60 and added the dedup pass, after duplicate stories from separately-generated clusters (e.g. "Van Attack..." / "Van Rams Crowd...") were observed in production.

---

## 6. Open problems / things to watch (living list — update as found, don't let this go stale)

- **The genuine-dispute gate is a single, unaudited boolean judgment call.** No second opinion, no logging of *why* a cluster was rejected beyond the topic name in a console log (not persisted anywhere queryable). If false negatives (real disputes wrongly marked routine) or false positives (manufactured disputes still slipping through) turn out to be common, we won't have data to diagnose it from — only anecdotal spot-checks like the one that motivated this fix. Worth considering: persisting rejected clusters somewhere queryable (even just a log table) if this needs tuning later.
- **Other categories of stories that might not fit the two-sided format**, not yet audited the way crime-blotter was: pure sports results, weather reports, market-close summaries, obituaries of public figures with no controversy attached. The same gate *should* catch these (they're not "genuine disputes" either), but this hasn't been specifically verified with real examples the way crime stories were.
- **`summary` vs. `what_happened` prompt overlap** — see Stage 4 above. The display-level fix is done; the generation-level fix (making the two fields actually ask for different things) isn't.
- **The coverage-update and dedup checks don't talk to each other within a single run** — a coverage-update match is checked against existing DB stories only, not against sibling clusters being generated in the same batch. Two similar clusters from the same run could both look "new" to the coverage check (nothing to compare against yet) and only get caught by dedup afterward. This is probably fine in practice (dedup is the safety net and runs every invocation) but worth knowing if a duplicate slips through inside a single run.
- **No automated eval/regression suite for prompt changes.** Every prompt change in this pipeline (including the dispute gate above) has been verified by hand — real synthetic test cases, real API calls, manual inspection of the output — rather than an automated test that could be re-run after future prompt tweaks to catch regressions. Worth considering if prompt iteration speeds up.
