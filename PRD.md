# FullScope — Product Requirements Document

*This document describes the app as it actually exists in the codebase today — not the original plan. It was written by reading every page, component, library file, database migration, and workflow config directly. Last verified: 2026-07-29.*

---

## 1. Product Overview

**FullScope** is a mobile-first, two-sided news platform. Instead of publishing a single framed narrative, every story on FullScope is built from multiple independent news sources and presented with **both real perspectives that divide people on that specific story** — named by the *argument* being made, not the tribe making it. Alongside the AI-assembled story, a community layer lets real readers add their own reactions, and those reader contributions can, when enough people independently make the same point, actually get folded back into the story itself.

**The problem it solves:** most news consumption is either (a) single-source and implicitly one-sided, or (b) an aggregator that just links out without synthesizing anything. FullScope's bet is that a reader who can see "here's what happened, here's side A's honest case, here's side B's honest case, here's why they disagree" walks away better informed than one who read a single outlet's take — and that this format works especially well for stories where the disagreement isn't a simple left/right split.

**Who it's for:** the product is currently running as a live pilot for **Hebrew-speaking Israeli news readers** — a deliberately narrow, well-defined market chosen because Israeli political and social splits (security vs. rights, religious vs. secular, coalition vs. opposition, hawkish vs. dovish) are a better test of the "genuine multi-perspective" idea than a generic international feed, where the framing tends to collapse into a US-style left/right binary. The pivot is built as a reversible configuration toggle (`NEXT_PUBLIC_LOCALE`), not a rewrite — the original English/international version, English source list, and English perspective-framing logic all still exist in the codebase, gated behind the toggle, so the product can return to an English/international audience later without rebuilding anything.

---

## 2. Core Concept

The single mechanic that makes FullScope distinct: **every story is required to have at least two independent, real news sources before it's allowed to exist at all**, and every story is required to present **two honest, named perspectives on that specific disagreement** — not a generic template, and not the outlet's own spin.

Concretely, this shows up as:
- A **2-distinct-source minimum** enforced in the pipeline before any story is generated — a single outlet's report never becomes a "story" on its own.
- **Stance-based perspective naming** — e.g. "security-first response" vs. "restraint and de-escalation" — rather than identity/group-based naming ("the right", "the left", a party name, a demographic label). The generation prompt explicitly instructs the model to phrase both sides with equal specificity and register, so neither reads as the neutral default and the other as the loaded label.
- **Locale-aware framing axis** — in Hebrew/Israeli mode, the model is told to pick whichever real axis genuinely divides people on *this* story (security vs. rights, religious vs. secular, coalition vs. opposition, government vs. civil-society critics, hawkish vs. dovish), rather than forcing a US-style left/right split that doesn't map onto Israeli politics.
- **Stories are living, not static** — a story's timeline, sources, and framing can be extended later, either because new reporting turns out to be a development of an existing story (see §3.1, "coverage" updates) or because enough independent readers converge on a point the story doesn't yet reflect (see §3.1, "trend" updates). Both are visible to readers as a "How this story developed" history, not hidden pipeline bookkeeping.

---

## 3. Feature List

Organized by the section of the app a reader actually encounters it in.

### 3.1 Stories (Home feed + Story page)

**Home feed** (`src/app/page.tsx`)
What it does: the main landing page — a header with the FullScope wordmark/tagline, a live stats row (story count, category count), a search entry point, and three tabs (Feed / History / Bookmarks) plus category filter pills (All / Politics / World / Technology / Science) with live counts.
How a user interacts with it: taps a category pill to filter (`?category=`), taps a tab to switch view (`?view=`), taps any story card to read it, taps the search bar to go to `/search`.
Implemented in: `src/app/page.tsx`, `src/components/story/category-filter.tsx`, `src/components/story/feed-tabs.tsx`, `src/components/story/story-card.tsx`, `src/components/story/most-discussed.tsx`.

**Story card** (`src/components/story/story-card.tsx`)
What it does: the reusable card shown in every list — cover photo (or a category-tinted icon placeholder if no photo), category chip, up to three status badges ("Top Story" on the featured card, "Updated" if the story had a qualifying update in the last 48h, "Added today" if generated the same calendar day in Israel time), title, summary, a perspective split-bar, a bookmark toggle, publish time, and reading time. Three variants: `featured` (hero card), `standard` (list card), `compact` (small row, used in "Trending now").
How a user interacts with it: tap anywhere to open the story; tap the bookmark icon independently to save/unsave without navigating.

**Story page** (`src/app/story/[slug]/page.tsx`)
What it does: the full reading experience for one story — hero image/banner with title, summary, bookmark and share buttons; a reading-progress bar; "What happened" (neutral factual summary); an expandable, confidence-tagged timeline; the two named perspectives with their supporting claims (collapsible cards); "Why they differ" (cause/impact explanation); "How this story developed" (see below); a tabbed reactions feed (seeded AI posts, split by perspective); real community posts related to this story; a source list; and related stories in the same category.
Implemented in: `src/app/story/[slug]/page.tsx`, `src/components/story/{story-hero,reading-progress,what-happened,timeline,perspectives,key-differences,story-updates,reactions-feed,community-posts,sources-list,related-stories}.tsx`.
Note: this route explicitly sets `dynamic = "force-dynamic"` and does **not** use `generateStaticParams` — a code comment documents this was a deliberate fix for a Next.js 16 bug where static generation silently produced false "story not found" pages in Hebrew mode.

**"How this story developed"** (`src/components/story/story-updates.tsx`, `src/lib/services/get-story-updates.ts`)
What it does: a visible, timestamped, oldest-first history of every way a story has changed since it was created — a reader-driven **trend** (several independent readers made the same point, folded into the story), a **coverage** update (new reporting turned out to be a development of this exact story, not a new one), or a **merge** (a duplicate story generated separately was consolidated into this one). Each entry shows an icon (trending/newspaper/merge), a short prefix, the summary, and a relative timestamp.
How a user interacts with it: purely read-only, appears on the story page whenever at least one update exists (renders nothing otherwise).

**"Updated" marker** — a 48-hour badge on any story card whose story received a `trend` or `coverage` update recently (not `merge`, since a dedup consolidation isn't "new context" from a reader's point of view).

**"Added today" marker** — a badge on any story card generated on the same calendar day, compared in Israel time regardless of the server's own clock or the pipeline's UTC cron schedule.

**"Trending now"** (`src/components/story/most-discussed.tsx`)
What it does: a top-3 "Trending now" rail on the All-categories home view, ranked by real post activity in the last 24 hours (not lifetime post count) — so a story's trending rank fades as engagement cools instead of staying pinned by an old burst.

**Category filter, Search, Related stories, Bookmarks, History** — see their own subsections below; all are variations on the same underlying story list.

### 3.2 Feed tabs: Feed / History / Bookmarks

**Feed** — the default view described above.

**History** (`src/lib/services/story-service.ts`'s `listArchivedStorySummaries`)
What it does: stories that aged out of the 60-story live cap, or were consolidated as a duplicate, are **archived, not deleted** — their posts, likes, and reader contributions stay fully intact, and they're browsable in this tab instead of disappearing. An archived story's own page is still directly viewable/linkable. If new reporting later turns out to be a development of an archived story, it's automatically revived back into the live feed with the new context folded in (same mechanism as a "coverage" update, see §3.1).
Empty state: "No removed stories yet."

**Bookmarks** (embedded via `src/components/bookmarks/bookmarks-page-client.tsx`, `hideHeading` mode)
What it does: shows the signed-in reader's saved stories directly in the home page's tab bar, reusing the same logic as the standalone `/bookmarks` page. Requires sign-in; the underlying bookmark toggle prompts sign-in if used while signed out.

### 3.3 Search (`src/app/search/page.tsx`, `src/components/search/search-page-client.tsx`)
What it does: free-text search across every story's title, summary, category, full body (what-happened + both perspectives), and source names — filtering happens client-side in memory over the full story list (`matchesQuery()` in `src/lib/services/story-summary.ts`), shared between the server-fetched initial list and the client filtering.

### 3.4 Posts (`src/app/posts/page.tsx`, `src/components/posts/*`)
What it does: a combined feed of AI-seeded reaction posts and real reader-submitted posts, optionally filtered to one story (`?story=`). Posts are ranked by a Hacker-News-style time-decayed score — `(likes + 1) / (ageHours + 2)^1.5` — so a good post surfaces without stale high-like-count posts burying everything newer forever.
How a user interacts with it: reads the feed, likes a post (real, persisted, one-per-user for community posts — signed-out users are redirected to sign in), taps "reply" (currently a stub — shows a "coming soon" toast, nothing is persisted).
Implemented in: `src/components/posts/{posts-feed-client,post-feed-card}.tsx`, `src/lib/posts/{rank,posts-context,actions,get-community-posts}.ts`.

### 3.5 Create (`src/app/create/page.tsx`, `src/components/posts/create-post-form.tsx`)
What it does: lets a signed-in reader write a post (280-char limit) and optionally tag it to a specific story. Rate-limited to 10 posts per rolling 10-minute window per user, enforced server-side in `createCommunityPostAction()`.

### 3.6 Community moderation & trend detection (backend, surfaces to readers only through its effects)
What it does: every new community post is screened by Claude before it can influence anything — genuine policy violations (harassment, threats, doxxing, spam) are quietly hidden; strong opinions, sarcasm, and one-sided takes are explicitly left alone (moderation is for abuse, not disagreement). Separately, when **2 or more distinct users** independently make the same point about a story that isn't yet reflected in it, the pipeline folds that point into the story (a new claim, or an extension to the "why they differ" text) and credits the contributing posts — visible on the story page as a "Readers pointed out: …" entry.
Implemented in: `src/lib/articles/{moderation,trend-detection}.ts`.

### 3.7 Bookmarking (`src/components/shared/bookmark-button.tsx`, `src/lib/bookmarks/*`)
What it does: a toggle button on every story card and the story hero. Persisted server-side per signed-in account (not local-storage), with optimistic UI (instant toggle, rollback on failure). Prompts sign-in if used while signed out.

### 3.8 Profile (`src/app/profile/page.tsx`, `src/components/profile/profile-page-client.tsx`)
What it does: shows the signed-in reader's post count, bookmark count, and "Your Impact" — a real list of stories the reader's own posts actually helped shape (via the trend-credit mechanism above). Shows category "preferences" (currently every category, unconditionally — see §8) and links to bookmarks/feedback/sign-out.

### 3.9 Settings (`src/app/settings/page.tsx`, `src/components/settings/settings-page-client.tsx`)
What it does: account row (email, sign-out), a working light/dark/system theme picker, and several visually-present-but-disabled rows for notification preferences and profile-info editing (see §8).

### 3.10 Feedback (`src/app/feedback/page.tsx`, `src/components/feedback/feedback-form.tsx`)
What it does: a segmented-choice + free-text form that opens the reader's own email client via a `mailto:` link to `jonathan19924@gmail.com` — no backend involved.

### 3.11 Authentication (`src/components/auth/*`, `src/lib/auth/actions.ts`)
What it does: email + password sign-up/sign-in via Supabase Auth. Sign-up is protected by a Cloudflare Turnstile CAPTCHA widget (only renders, and is only required, if `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is configured). Session cookies are refreshed on every request via Next.js middleware (`src/proxy.ts`); `/bookmarks` and `/profile` get an optimistic redirect-to-sign-in if no session is present, though the actual authorization check happens again server-side wherever data is written.

### 3.12 PWA / installability
What it does: FullScope is installable to a phone's home screen — custom app icon (auto-generated via Next's `icon`/`apple-icon` file conventions), a web manifest (`src/app/manifest.ts`) with name/icons/theme color, and the appropriate meta tags for iOS "add to home screen" behavior (status bar style, apple-mobile-web-app tags).

### 3.13 Theming
What it does: full light/dark/system theme support via `next-themes`, toggle available in the top nav and Settings.

---

## 4. Tech Stack

| Layer | Choice | Responsibility |
|---|---|---|
| Framework | **Next.js 16.2.10** (App Router, Turbopack) | Routing, Server/Client Components, Server Actions, PWA manifest/icon conventions |
| Language | **TypeScript 5** | Whole codebase; `moduleResolution: "bundler"`, path alias `@/* → ./src/*` |
| UI runtime | **React 19.2.4** / **React DOM 19.2.4** | Component rendering |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss`) + `tailwind-merge`, `tw-animate-css`, `class-variance-authority` | Utility-first styling, RTL logical-property support (`ps-`, `start-`, etc.) |
| UI primitives | Hand-built `src/components/ui/*` on **`@base-ui/react`** (dialogs), plus `sonner` (toasts), `lucide-react` (icons), `framer-motion` (animation) | shadcn-style component library |
| Theming | **`next-themes`** | Light/dark/system mode |
| Database + Auth | **Supabase** (Postgres + Auth), via **`@supabase/supabase-js`** and **`@supabase/ssr`** | All persistent data; email/password auth, RLS-scoped reads/writes from the browser and server, service-role bypass for backend pipeline writes |
| AI / content generation | **Anthropic Claude** (`claude-sonnet-5`, extended thinking disabled), called via **raw `fetch()`** — no `@anthropic-ai/sdk` dependency | Topic clustering, story generation (two perspectives, timeline, sources), reaction-post generation, dedup detection, coverage-update / trend-update detection, content moderation, image-keyword derivation |
| RSS ingestion | **`fast-xml-parser`** | Parsing RSS 2.0 / Atom / RSS 1.0(RDF) feeds from ~31 English or ~35 Hebrew/Israeli news sources |
| Stock photography | **Pexels API** (raw `fetch()`) | One photo per story, searched by title then category fallback |
| Transactional email | **Resend** (raw `fetch()`, no SDK) | Pipeline summary emails, missed-run alerts, moderation alerts — all sent to a single ops address |
| Bot protection | **Cloudflare Turnstile** | CAPTCHA on sign-up only |
| Dates | **`date-fns`** (+ `date-fns/locale/he`) | Locale-aware relative/absolute date formatting |
| Hosting | **Vercel** | App hosting, 2 of the 4 cron jobs (Vercel Hobby only supports daily-frequency cron) |
| Scheduled jobs (higher-frequency / longer-running) | **GitHub Actions** | The two crons that need sub-daily frequency or exceed Vercel Hobby's serverless timeout — `process-articles.yml` (every 3h) and `check-trends.yml` (every 2h) |
| Cross-system trigger | GitHub REST API (`workflow_dispatch`), via a fine-grained PAT | Lets Vercel's health-check cron re-trigger the GitHub Actions pipeline if it appears to have silently not run |
| Dev/test runner for pipeline scripts | **`ts-node`** (CommonJS/Node10 module resolution override) | Running `scripts/*.ts` outside of Next's own build pipeline |
| Linting | **ESLint 9** (flat config), `eslint-config-next` | `core-web-vitals` + TypeScript presets |

---

## 5. Data Model

All tables are Postgres, in Supabase, with Row Level Security enabled on every table. Schema below reflects the cumulative state after all 12 migrations in `supabase/migrations/`.

### `stories`
The core content table — one row per published (or archived) story.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | default `gen_random_uuid()` |
| `slug` | text, unique, not null | |
| `title` | text, not null | |
| `category` | text, not null | check: `Politics \| World \| Technology \| Science` |
| `summary` | text, not null | |
| `what_happened` | text, not null | |
| `timeline` | jsonb, not null, default `[]` | array of `{ text, confidence }` |
| `perspective_a` / `perspective_b` | jsonb, not null | `{ name, summary, claims[] }` |
| `key_differences_cause` / `key_differences_impact` | text, not null | |
| `sources` | jsonb, not null, default `[]` | array of `{ publisher }` |
| `entities` | jsonb, not null, default `{people:[],companies:[],countries:[]}` | not currently populated/read by app code |
| `published_at` | timestamptz, not null | derived from the most recent source article, not generation time |
| `reading_time_minutes` | integer, default 3 | |
| `created_at` | timestamptz, default `now()` | |
| `generated_at` | timestamptz | when the pipeline actually created the row — drives "Added today" |
| `image_url` | text | Pexels photo URL, nullable |
| `last_trend_check_at` | timestamptz | used by trend-detection to skip stories with no new posts |
| `archived_at` | timestamptz | non-null = removed from the live feed, shown in History |

RLS: publicly readable (select) for `anon`/`authenticated`; all writes are service-role only (backend pipeline).
Indexes: category, `published_at desc`, `generated_at`, `archived_at`.

### `posts`
AI-seeded reaction posts, generated alongside each story.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `story_id` | uuid, FK → `stories(id)` ON DELETE CASCADE | |
| `display_name` | text, not null | fictional persona name |
| `perspective` | text, check `A \| B` | |
| `content` | text, not null | |
| `is_generated` | boolean, default true | |
| `like_count` / `reply_count` | integer, default 0 | not live-updated by real likes (see `community_post_likes` below) |
| `created_at` | timestamptz, default `now()` | |

RLS: publicly readable, no write policies (service-role only).

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid, PK, FK → `auth.users(id)` ON DELETE CASCADE | |
| `display_name` | text | |
| `preferences` | jsonb, default `{theme:"system", followedCategories:[]}` | `followedCategories` is stored but never read/written by any app code found — not yet a real feature |
| `created_at` | timestamptz, default `now()` | |

A trigger (`on_auth_user_created` → `handle_new_user()`, security definer) automatically inserts a profile row whenever a new `auth.users` row is created.
RLS: a user can select/update only their own row.

### `bookmarks`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → `auth.users(id)` ON DELETE CASCADE | |
| `story_slug` | text, not null | **no FK** — deliberately, since seed-mode stories use non-UUID ids |

Unique constraint on `(user_id, story_slug)`. RLS: user can select/insert/delete only their own rows.

### `raw_articles`
Backend-only staging table for fetched RSS items — never exposed to `anon`/`authenticated` (RLS enabled, zero policies; only the service-role key can touch it).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `source_name` | text, not null | |
| `source_lean` | text | check: `centre \| left \| right \| international \| technology \| science \| middle_east` |
| `title` | text, not null | |
| `description` | text | |
| `url` | text, unique, not null | upsert conflict target |
| `published_at` | timestamptz | |
| `fetched_at` | timestamptz, default `now()` | |
| `processed` | boolean, default false | |
| `category` | text | |
| `topic_cluster` | text | tagged during clustering |
| `perspective_lean` | text | tagged when a cluster is marked processed |

### `pipeline_runs`
Heartbeat/audit log for the `process-articles` pipeline — backend-only.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `job` | text, default `'process-articles'` | |
| `ran_at` | timestamptz, default `now()` | |
| `status` | text, check `success \| error` | |
| `detail` | text | human-readable summary |

### `community_posts`
Real reader-submitted posts.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → `auth.users(id)` ON DELETE CASCADE | |
| `content` | text, not null | |
| `related_story_slug` / `related_story_title` / `related_story_category` | text, nullable | denormalized at post time |
| `created_at` | timestamptz, default `now()` | |
| `credited_at` | timestamptz | set once this post's point has been folded into a story |
| `moderation_checked_at` | timestamptz | |
| `is_hidden` | boolean, not null, default false | set by moderation |
| `flagged_reason` | text | |

RLS: publicly readable (select); a user can insert/delete only their own posts.

### `post_contributions`
Records exactly what a reader-trend update changed, and which posts drove it.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `story_id` | uuid, FK → `stories(id)` ON DELETE CASCADE | |
| `story_slug` | text, not null | |
| `post_ids` | uuid[], not null | the contributing posts |
| `theme` | text, not null | |
| `update_target` | text, check `perspective_a_claims \| perspective_b_claims \| key_differences_cause \| key_differences_impact` | |
| `added_text` | text, not null | |
| `created_at` | timestamptz, default `now()` | |

RLS: publicly readable; writes are service-role only.

### `community_post_likes`
Real, persisted, one-per-user likes on community posts.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `post_id` | uuid, FK → `community_posts(id)` ON DELETE CASCADE | |
| `user_id` | uuid, FK → `auth.users(id)` ON DELETE CASCADE | |
| `created_at` | timestamptz, default `now()` | |

Unique `(post_id, user_id)`. RLS: publicly readable; a user can insert/delete only their own like.

### `story_updates`
The "How this story developed" audit trail.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, PK | |
| `story_id` | uuid, FK → `stories(id)` ON DELETE CASCADE | |
| `story_slug` | text, not null | |
| `update_type` | text, check `trend \| merge \| coverage` | widened from `trend \| merge` in migration 0012 |
| `summary` | text, not null | |
| `created_at` | timestamptz, default `now()` | |

RLS: publicly readable; writes are service-role only.

### Known discrepancy: `src/lib/supabase/database.types.ts`
This hand-written type file is **stale** relative to the real schema — it's missing `raw_articles` and `pipeline_runs` entirely (intentionally, per code comments — those are backend-only and queried with untyped Supabase clients), and its `stories.Row` type is missing `image_url`, `archived_at`, and `last_trend_check_at`, even though real code reads/writes all three via cast-through-`unknown` row interfaces. Regenerating this file (`npx supabase gen types typescript`) would be a good, low-risk cleanup.

---

## 6. API Routes

FullScope has exactly **4 HTTP API routes**, all under `src/app/api/cron/*/route.ts`, all `GET`, all `export const dynamic = "force-dynamic"`. Every route is gated by the same secret check: `process.env.CRON_SECRET` must match either the `Authorization: Bearer <secret>` header (how Vercel's own cron caller authenticates) or a raw `cron-secret` header (for manual `curl` testing). Everything else in the app that mutates data (bookmarks, likes, community posts, sign-out) is a Next.js **Server Action**, not a route handler.

### `GET /api/cron/fetch-rss`
- **Triggers:** Vercel cron, `0 6 * * *` (06:00 UTC daily), per `vercel.json`.
- **Input:** none beyond the auth header.
- **Behavior:** calls `fetchAllFeeds()` — parses every active RSS/Atom feed (locale-scoped source list), upserts new items into `raw_articles` (`onConflict: "url", ignoreDuplicates: true`).
- **Returns:** `{ totalSaved: number, results: [...] }`.
- **maxDuration:** 60s.

### `GET /api/cron/process-articles`
- **Triggers:** not on any Vercel cron (a full run exceeds Vercel Hobby's short serverless timeout) — kept only for manual/small-batch testing. The real schedule is GitHub Actions (`process-articles.yml`, every 3 hours).
- **Input:** none beyond the auth header.
- **Behavior:** calls `processArticles()` — the full Stage-2 pipeline: clustering, coverage-update detection, story/post generation, dedup, cap enforcement, image backfill (see §3.1 and §9 of the codebase survey for the exact phase order).
- **Returns:** `ProcessArticlesResult` — `{ processedCount, newStoryCount, updatedStoryCount, mergedDuplicateCount, totalStories }`.
- **maxDuration:** 60s (irrelevant in practice since this isn't the route actually scheduled for full runs).

### `GET /api/cron/check-trends`
- **Triggers:** not on any Vercel cron (Hobby only supports daily frequency) — real schedule is GitHub Actions (`check-trends.yml`, every 2 hours).
- **Input:** none beyond the auth header.
- **Behavior:** calls `moderateNewPosts()` (hides genuine policy violations in new community posts) then `checkStoryTrends()` (folds reader-convergent points into stories).
- **Returns:** `{ trends: ..., moderation: ... }`.
- **maxDuration:** 60s.

### `GET /api/cron/check-pipeline-health`
- **Triggers:** Vercel cron, `20 9 * * *` (09:20 UTC daily), per `vercel.json`.
- **Input:** none beyond the auth header.
- **Behavior:** calls `checkPipelineHealth()` (reads the most recent `pipeline_runs` row for `job = "process-articles"`; considers it unhealthy if >20h stale). If unhealthy: calls `triggerProcessArticlesWorkflow()` (fires a GitHub `workflow_dispatch` via `GITHUB_ACTIONS_PAT`) and always emails a status alert (`sendMissedRunAlertEmail`) — including when the retry itself fails, so a real failure is never silent.
- **Returns:** health status + retry outcome.
- **maxDuration:** 30s.

---

## 7. User Flows

**1. First-time reader, browsing without an account**
Home page loads → sees the featured story, "Trending now" rail, and the latest-stories list, all in Hebrew/RTL → taps a category pill to narrow the list → taps a story card → reads the hero, "What happened," expandable timeline, the two named perspectives with their claims, "Why they differ," and (if any exist) "How this story developed" → scrolls to the reactions feed and real community posts → taps the bookmark icon → is redirected to `/sign-in?next=/story/<slug>` since bookmarking requires an account.

**2. Signing up**
Taps "Home" nav → is on `/`, taps a protected action (bookmark) → lands on `/sign-in` → taps "Sign up" → fills email/password → completes the Turnstile challenge (if configured) → `supabase.auth.signUp` succeeds → a `profiles` row is auto-created via the `handle_new_user` trigger → redirected back to whatever page originally required sign-in.

**3. Reading a story that's part of an ongoing situation**
Reader opens a story generated yesterday → sees an "Updated" badge on its card → opens it → "How this story developed" shows a "New development: …" entry from a `coverage`-type update, timestamped a few hours ago — meaning the pipeline's most recent run found new reporting confirming this is the same ongoing story, and folded a new timeline fact and additional sources into it rather than creating a duplicate story.

**4. A story a reader cares about eventually ages out, then comes back**
A story sits unread for a while; the pipeline's 60-story cap eventually archives it (oldest-first) to make room for new stories — it disappears from the main Feed but is now visible in the History tab, fully intact (posts, likes, everything). Some days later, new reporting on the same real-world situation comes in; the pipeline's relatedness check identifies it as a continuation of the archived story, folds in the new development, and clears its `archived_at` — the story reappears in the live Feed, now updated, exactly where it would have been if it had never left.

**5. Contributing real context as a reader**
Signed-in reader taps "Create" → writes a 280-character post, optionally tagging it to a specific story → submits (rate-limited to 10/10min) → the post is screened by Claude on the next moderation pass (hidden only for genuine abuse, never for a strong opinion) → if at least one other distinct reader independently makes the same point about the same story, the next trend-detection pass folds that point into the story itself, credits both posts (`credited_at` set, a `post_contributions` row recorded), and logs a "Readers pointed out: …" entry visible to every future reader of that story → the contributing reader can later see this reflected in their own Profile page under "Your Impact."

**6. Liking and ranking**
Reader opens Posts (or a story's community-post section) → taps like on a real post → the like is persisted immediately (optimistic UI, rollback on failure) → the feed re-ranks using the decayed score, so a post that's getting fresh likes now can outrank an older post with more total likes.

**7. Pipeline operator's-eye view (not reader-facing, but load-bearing)**
06:00 UTC: Vercel fetches fresh RSS → new `raw_articles` rows. Every 3 hours: GitHub Actions runs `process-articles` — clusters the backlog, checks each cluster against existing stories (fold into an existing one, or create new), regenerates images for anything missing one, dedupes, and enforces the 60-story cap. Every 2 hours: GitHub Actions runs `check-trends` — moderates new posts, then folds in any reader-convergent points. 09:20 UTC daily: Vercel checks whether `process-articles` has recorded a heartbeat in the last 20 hours; if not, it actively re-triggers the GitHub workflow and emails an alert either way.

---

## 8. Current Limitations / Not Yet Built

Everything below is either explicitly stubbed in the UI ("coming soon"), present in the schema but unused, or a known inconsistency — called out here rather than silently glossed over.

- **Post replies are not persisted.** The reply form on a post (`post-feed-card.tsx`) shows a "coming soon" toast and clears the textarea; nothing is written anywhere.
- **Push notifications and in-app notification preferences don't work.** Settings shows three notification toggle rows, all visually disabled (`DisabledToggleRow`) — no notification system exists at all yet.
- **Profile editing isn't implemented.** Both the Settings "Profile info" row and the Profile page's edit-pencil icon just show a toast; there is no form to actually change display name or other profile fields.
- **Category personalization/following isn't real.** `profiles.preferences.followedCategories` exists as a schema column but is never read or written by any code path found — the Profile page shows every category as a "preference," unconditionally, for every reader.
- **No likes/reactions on AI-seeded posts** — only real community posts have persisted, per-user likes (`community_post_likes`). Seed/generated posts' `like_count` is a static number from generation time and any "like" on them is local UI state only, not saved anywhere.
- **No moderation appeal or visibility into why a post was hidden** — a hidden post just disappears for the author; `flagged_reason` is stored but not surfaced anywhere in the UI.
- **`entities` field on stories is unused** — the column (`people`/`companies`/`countries`) exists and is generated as an empty structure, but nothing reads or displays it.
- **`database.types.ts` is stale** relative to the real schema (see §5) — a regeneration is safe, low-risk cleanup, not yet done.
- **`.env.local.example` is out of date** — it documents `SUPABASE_SERVICE_ROLE_KEY` as being used by a `scripts/seed-content.ts` that no longer exists (the key is actually used across multiple pipeline files), and it's missing three env vars the app genuinely reads: `GITHUB_ACTIONS_PAT`, `NEXT_PUBLIC_LOCALE`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- **`README.md` is significantly stale** — it describes FullScope as reading only local seed data with no live ingestion, and describes bookmarks as browser-localStorage-only with no account needed. Neither is true anymore.
- **Workflow env inconsistency** — `process-articles.yml` explicitly sets `NEXT_PUBLIC_LOCALE: he`; `check-trends.yml` does not set it at all. Not currently believed to cause a bug (trend-detection/moderation code doesn't appear to branch on locale directly), but worth confirming and aligning.
- **No English-mode content pipeline currently running** — the reversible `LOCALE` toggle and the English source list/seed data all still exist and work, but there is no live English pipeline deployment today; switching back would need its own GitHub Actions workflow (or reusing the existing ones with the locale flipped) and a decision about running both locales in parallel vs. sequentially.
- **No automated tests** — no test runner, test files, or CI test step exist anywhere in the repository; correctness is currently established by manual verification against production data (as documented throughout this project's development history) rather than an automated suite.
- **Merge/coverage-update false-positive risk is mitigated, not eliminated** — the relatedness check that folds new coverage into an existing story is deliberately biased toward "treat as new" on any doubt, but is still a probabilistic LLM judgment; there is no reader-facing "undo" if it ever merges two genuinely distinct events.

---

## 9. Environment Variables & Setup

### Required to run locally

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Where to get it | Required for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API | Everything — database and auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API | Browser/server reads respecting RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API | Backend pipeline scripts only (bypasses RLS) — never expose to the client |
| `CRON_SECRET` | Generate your own (`openssl rand -hex 32`) | Authorizing the 4 `/api/cron/*` routes |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Story generation, clustering, dedup, trend detection, moderation |
| `RESEND_API_KEY` + `NOTIFICATION_EMAIL` | resend.com (free tier) | Pipeline summary/alert emails — both must be set or emails are silently skipped |
| `PEXELS_API_KEY` | pexels.com/api (free) | Story photos — if unset, stories just show a category icon placeholder instead |

### Required but **not** currently documented in `.env.local.example` (a gap worth fixing)

| Variable | Purpose |
|---|---|
| `GITHUB_ACTIONS_PAT` | Fine-grained GitHub PAT (Actions: read-and-write) — lets the health-check cron re-trigger `process-articles.yml` if it appears to have silently failed |
| `NEXT_PUBLIC_LOCALE` | `"he"` for Hebrew/RTL (the current live configuration); anything else falls back to English/LTR |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key — sign-up works without it, just without a CAPTCHA challenge |

### Running it

```bash
npm install
cp .env.local.example .env.local   # then fill in the values above
npm run dev                        # app at localhost:3000
```

To exercise the content pipeline locally (requires the Supabase + Anthropic + Pexels + Resend keys above to be real, since these scripts write to the actual configured Supabase project):

```bash
npm run fetch-rss          # Stage 1: pull fresh RSS into raw_articles
npm run process-articles   # Stage 2: cluster + generate/update stories
npm run check-trends       # Stage 3: moderate posts + fold in reader trends
npm run backfill-images    # maintenance: catch up missing story photos only
```

### Production deployment topology

- **App + 2 crons** (`fetch-rss` daily, `check-pipeline-health` daily) run on **Vercel**, configured in `vercel.json`.
- **2 higher-frequency crons** (`process-articles` every 3h, `check-trends` every 2h) run on **GitHub Actions** (`.github/workflows/*.yml`), because Vercel's Hobby plan only supports daily cron frequency and a full pipeline run exceeds Vercel's serverless function timeout.
- Both deployment surfaces read from and write to the **same Supabase project** — there is no separate staging database.
