# FullScope — Marketing Brief

*A plain-language briefing document for marketing/strategy work — not a technical spec. Written to be handed to a person or another AI assistant with zero prior context on the product. Reflects the app as it actually exists today, verified against the live codebase and production app, not aspirational copy.*

*Last verified: 2026-08-25. Status: version 1.2 (build 3) is live and approved on the App Store — no version currently pending.*

---

## 1. What FullScope is, in one paragraph

FullScope is a mobile news app (iOS, with a Hebrew-language pivot for the Israeli market) that shows every story from **both real sides that genuinely disagree about it** — not a single outlet's framing presented as neutral, and not a generic "left vs. right" template forced onto every topic. Each story is built from multiple independent news sources, includes a neutral factual summary, a confidence-rated timeline, and two named perspectives — named by the *argument* each side makes (e.g. "security-first response" vs. "restraint and de-escalation"), never by a political party or group label. Readers can also react, post, follow each other, and — when several people independently make the same real point — see that point actually folded back into the story itself.

## 2. The core idea / differentiator

Most news apps are one of two things: a single-source feed (implicitly one-sided, even when it doesn't feel that way), or an aggregator that just links out without synthesizing anything. FullScope's bet: a reader who sees "here's what happened, here's side A's honest case, here's side B's honest case, here's *why* they disagree" walks away better informed than one who read a single outlet's take.

The mechanism that makes this a real product feature, not just a claim:
- **A story needs 2+ independent sources before it's allowed to exist at all.** One outlet's report is never a "story" on its own.
- **A story also needs a genuine, substantive dispute — not manufactured controversy.** A routine arrest or an uncontested final score doesn't get forced into a fake "two sides" format. This applies across every topic (politics, business, sports, science), not just politics.
- **Perspectives are named by the stance, not the tribe.** "Restraint and de-escalation," not "the left." This is the actual neutrality lever — a group label is inherently more loaded than an argument label.
- **Stories are alive, not static.** When new reporting comes in, it gets folded into the existing story (a visible "How this story developed" history) instead of spawning a disconnected duplicate. When several distinct readers independently make the same valid point, it gets folded into the story too, with credit. Individual reader posts get classified onto the side they actually lean toward and show up in that side's own reactions — real reader sentiment, not just seeded/placeholder examples.

## 3. Who it's for

Currently a **deliberate, narrow pilot: Hebrew-speaking Israeli news readers.** This wasn't a fallback choice — Israeli political and social splits (security vs. rights, religious vs. secular, coalition vs. opposition, hawkish vs. dovish) don't reduce to a simple US-style left/right binary, which makes them a *better* test of "does genuine multi-perspective news actually work" than a generic international feed would be. The pivot is a reversible configuration toggle, not a rewrite — the original English/international version still exists in the codebase and could be reactivated later, but there is no live English deployment today. **Assume Hebrew/Israeli is the only real market for now** when thinking about marketing.

## 4. What's actually built and live today (reader-facing)

Everything below exists and works in the current app — useful for knowing what you can honestly claim.

- **Two-sided story pages**: neutral summary, factual "what happened," an expandable timeline with per-fact confidence ratings (confirmed/reported/disputed/unknown), two full named perspectives with their own claims, a "why they differ" explainer, a sources list.
- **"Developing" and "Updated" indicators** — a story actively unfolding right now (updated within the last ~6 hours) is visually flagged differently from one that was merely touched at some point in the last two days, so a reader following breaking news can tell the difference at a glance.
- **"How this story developed"** — a visible, timestamped history of every real update to a story (new coverage folded in, or a reader-driven point credited), including highlighting for a returning reader of what's new since their last visit.
- **A community layer**: real reader posts (with optional photos), each with its own shareable page, likes, threaded comments/replies, a save-for-later bookmark, share, following other readers, a personal "Your Impact" record of posts that actually shaped a story.
- **Push notifications** now exist and reach the lock screen — likes, comments, new followers, a bookmarked story getting a real update, and a 4x-daily "trending story" alert. Each reader controls their own push preferences (a master on/off switch, plus separate toggles for social interactions vs. story-update alerts).
- **Bookmarks** (both saved stories and saved posts, in separate tabs), **search, category browsing** (9 categories: Politics, Security & Defense, Law & Courts, Crime & Safety, World, Business & Economy, Technology, Science, Society & Religion), a "Trending now" module ranked by real 24h engagement, an archive/History tab for stories that aged out of the live feed.
- **Post directly from a story you're reading** — not just from a separate "Create" tab, including a persistent floating compose button so it's always reachable without scrolling.
- **Full account safety/compliance layer**: self-service account deletion, blocking, reporting, a privacy policy page.
- **Automated content moderation** — abuse/harassment/spam is filtered out; strong opinions and disagreement are explicitly left alone (moderation targets abuse, not viewpoint).
- **Light/dark/system theme**, installable as a native iOS app.

## 5. What's explicitly *not* built yet — don't market these

- **No Android app.** iOS only.
- **No profile photo upload** — every avatar is a colored circle with initials.
- **No formal human editorial staff.** Stories are AI-assembled from real, named news sources via Claude (Anthropic), not written by a newsroom. This is true and should be represented honestly — the credibility claim is "grounded in real, named, multiple sources with a structural neutrality mechanism," not "written by journalists."
- **No desktop-optimized layout** — the app is mobile-first/mobile-only today; a desktop visitor gets the same narrow mobile-width column, not a real wide-screen design.

## 6. Brand identity notes

- **Name**: FullScope. **Tagline** (Hebrew): "להבין את הסיפור, לא רק את הכותרת" — "Understand the story, not just the headline."
- **Visual mark**: a two-circle "twin lens" symbol (two overlapping circles), evoking dual perspective/viewpoint literally.
- **Palette**: dark-mode-first, a warm gold accent color (used for "trending"/premium signals), cool-vs-warm neutral gray pairing specifically for the two perspective sides (deliberately equal visual weight — neither side is ever the "brighter" or more prominent color).
- **Typography**: one clean sans font (Heebo) for both headlines and body in Hebrew mode — a headline serif (Frank Ruhl Libre) was tried and dropped after readers found it hard to read, so the "real publication" feel currently comes from layout and restraint rather than a serif/sans pairing.
- **Tone implied by the product itself**: calm, structural neutrality — the app's own design goes out of its way to avoid visually favoring one side (equal card weight, equal claim counts, mechanically randomized which side displays first). Marketing tone should probably match: confident about the *format* being fair, not strident or political in either direction.

## 7. Where things stand right now

Version 1.2 is live and approved — includes everything from 1.1 (push notifications, Sign in with Apple/Google, a camera fix, a new app icon) plus two push-notification reliability fixes that shipped in 1.2 (device tokens weren't being registered at all before this, and foreground pushes were showing nothing). No version is currently pending. No public launch/marketing push has happened yet. Signups are auto-approved (no manual review gate), specifically to make onboarding frictionless at launch.

## 8. Open questions for marketing strategy (not answered here — for the strategy conversation itself)

- Primary acquisition channel(s) for a Hebrew-speaking Israeli audience specifically.
- How explicitly to lead with the "two-sided/neutral" positioning vs. a softer "understand the full picture" framing — the two-sided format is the real differentiator but could also read as "about politics" to someone skimming, when it's explicitly topic-agnostic.
- Whether/how to address the "AI-generated" nature of stories proactively in messaging, versus letting the sourcing-transparency (real named sources, visible confidence ratings) speak for itself.
- Timing: the version-approval blocker is now cleared (1.2, which includes push notifications and social sign-in, is live and approved) — the open question is just when to actually start launch messaging, not what to wait for.
