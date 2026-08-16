# FullScope — Product Requirements Document

*This document describes the app as it actually exists in the codebase today — not the original plan. Verified directly against the code, database migrations, and a live production app. Last verified: 2026-08-16.*

---

## 1. Product Overview

**FullScope** is a mobile-first, two-sided news platform, shipped both as a web app and as a native iOS app (Capacitor shell around the same live web app — see §4). Instead of publishing a single framed narrative, every story on FullScope is built from multiple independent news sources and presented with **both real perspectives that divide people on that specific story** — named by the *argument* being made, not the tribe making it. Alongside the AI-assembled story, a community layer lets real readers add their own reactions and posts, follow each other, and — when enough people independently make the same point — get that point folded back into the story itself.

**The problem it solves:** most news consumption is either (a) single-source and implicitly one-sided, or (b) an aggregator that just links out without synthesizing anything. FullScope's bet is that a reader who can see "here's what happened, here's side A's honest case, here's side B's honest case, here's why they disagree" walks away better informed than one who read a single outlet's take — and that this format works especially well for stories where the disagreement isn't a simple left/right split.

**Who it's for:** the product is currently running as a live pilot for **Hebrew-speaking Israeli news readers** — a deliberately narrow, well-defined market chosen because Israeli political and social splits (security vs. rights, religious vs. secular, coalition vs. opposition, hawkish vs. dovish) are a better test of the "genuine multi-perspective" idea than a generic international feed, where the framing tends to collapse into a US-style left/right binary. The pivot is built as a reversible configuration toggle (`NEXT_PUBLIC_LOCALE`), not a rewrite — the original English/international version, English source list, and English perspective-framing logic all still exist in the codebase, gated behind the toggle, so the product can return to an English/international audience later without rebuilding anything. There is no live English deployment today.

**Launch status:** submitted to the App Store; awaiting approval as of this writing (one prior rejection — missing account deletion — has since been fixed and resubmitted). Signups are auto-approved (no manual review gate), a deliberate choice made ahead of launch so onboarding has no friction.

---

## 2. Core Concept

The single mechanic that makes FullScope distinct: **every story is required to have at least two independent, real news sources before it's allowed to exist at all**, and every story is required to present **two honest, named perspectives on that specific disagreement** — not a generic template, and not the outlet's own spin.

Concretely, this shows up as:
- A **2-distinct-source minimum** enforced in the pipeline before any story is generated — a single outlet's report never becomes a "story" on its own.
- A **genuine-dispute gate** — a routine, undisputed report (an arrest with no controversy, an uncontested final score, a plain earnings report) never gets forced into a fake "two sides" format. This gate is topic-agnostic: a genuine dispute can be political, but it can equally be a business fight, a sports controversy, a science/tech ethics debate, or a legal dispute.
- **Stance-based perspective naming** — e.g. "security-first response" vs. "restraint and de-escalation" — rather than identity/group-based naming ("the right", "the left", a party name, a demographic label). The generation prompt explicitly instructs the model to phrase both sides with equal specificity and register, so neither reads as the neutral default and the other as the loaded label.
- **Locale-aware framing axis** — in Hebrew/Israeli mode, the model is told to pick whichever real axis genuinely divides people on *this* story (security vs. rights, religious vs. secular, coalition vs. opposition, government vs. civil-society critics, hawkish vs. dovish), rather than forcing a US-style left/right split that doesn't map onto Israeli politics.
- **Stories are living, not static** — a story's timeline, sources, and framing can be extended later, either because new reporting turns out to be a development of an existing story ("coverage" updates) or because enough independent readers converge on a point the story doesn't yet reflect ("trend" updates). Both are visible to readers as a "How this story developed" history, not hidden pipeline bookkeeping. A "Developing" badge (tight ~6h window) flags a story actively unfolding right now, distinct from the softer "Updated" badge (~48h window) for one merely touched recently; a returning reader also sees which update entries are new since their own last visit.
- **Best-effort background context**: when a story mentions an entity a general reader might not recognize, the pipeline checks Wikipedia and — only if a reader would genuinely be missing something — weaves a brief, neutral factual clarification into the "what happened" text. Most stories never trigger this at all.
- **Related-story matching uses semantic similarity, not just recency/category** — new coverage is checked against the entire live+archived story corpus via embedding similarity (Voyage AI), so a genuine continuation of an older or previously-miscategorized story is still found, not just recent same-category ones.

---

## 3. Feature List

Organized by the section of the app a reader actually encounters it in.

### 3.1 Stories (Home feed + Story page)

**Home feed** (`src/app/page.tsx`)
The main landing page — FullScope wordmark/tagline, a live stats row (story/category counts), a search entry point, three tabs (Feed / History / Bookmarks), a category filter (9 categories, collapsible "More" toggle), and a "Trending now" module (top 3 by real 24h post activity, visually set apart with a gold-tinted border). Below it, the rest of the feed renders as compact paginated rows (10 at a time, "show more"), not full cards.

**Story card** (`src/components/story/story-card.tsx`)
The reusable card/row shown across lists. Full variant: cover photo (or category-tinted icon placeholder), category chip, status badges ("Top Story" on the featured card, "Developing" for a story actively updating within ~6h, "Updated" for one touched within ~48h, "Added today" if generated the same calendar day in Israel time), title, summary, a perspective split-bar, a like toggle, publish/reading time. Compact variant (used in feed/history/bookmark lists): a smaller row with an 92px thumbnail and a dot-only "Developing" indicator to avoid adding text bulk.

**Story page** (`src/app/story/[slug]/page.tsx`)
The full reading experience — hero image/banner with title, "Developing" badge if applicable, like/dislike/share/map buttons; a reading-progress bar; "What happened" (neutral factual summary, occasionally with brief woven-in background context); an expandable, confidence-tagged timeline; the two named perspectives with supporting claims (collapsible); "Why they differ"; "How this story developed" (with "New" highlighting for entries since the reader's last visit); a reactions feed (seeded AI posts split by perspective); real community posts related to this story, with a "Write a post" button that opens the composer with this story pre-tagged; a collapsible source list; related stories.
Implemented in: `src/app/story/[slug]/page.tsx` and `src/components/story/*`.

**"View on map"** — stories genuinely tied to one specific place (extracted at generation time) get a map-pin button in the hero that deep-links to a Google Maps search by name. Most stories (national policy, elections, court rulings) don't qualify and don't show it.

**"Trending now"** (`src/components/story/most-discussed.tsx`)
Top-3 rail ranked by real post activity in the last 24 hours (not lifetime count), so a story's rank fades as engagement cools instead of staying pinned by an old burst.

### 3.2 Feed tabs: Feed / History / Bookmarks

**Feed** — the default view described above, with the same category filter as History.

**History** — stories archived (not deleted) after aging out of the 60-story live cap, or consolidated as a duplicate. Posts, likes, and reader contributions stay fully intact; a story's own page is still directly viewable. New reporting on an archived story automatically revives it back into the live feed.

**Bookmarks** — the signed-in reader's saved stories, embedded in the home tab bar and also available at `/bookmarks`. Requires sign-in.

### 3.3 Search (`/search`)
Free-text search across every story's title, summary, category, full body, and source names, plus a separate "People" tab to find other readers by name/username.

### 3.4 Posts (`/posts`, `src/components/posts/*`)
A combined feed of AI-seeded reaction posts and real reader posts (optionally with a photo, moderated), optionally filtered to one story or to an "All"/"Following" toggle. Ranked by a time-decayed score so a good post surfaces without stale high-like-count posts burying everything newer. Each real post supports: like (persisted, one-per-user), threaded comments, and a "⋯" menu to report the post/comment or block its author. Replies to individual posts (distinct from comments) are a UI stub only — no backend exists for that specific interaction.

### 3.5 Create (`/create`, and directly from any story page)
A signed-in reader can write a post (280-char limit, optional photo) and tag it to a specific story — either from the standalone Create tab (pick any story from a dropdown) or directly from a story page itself, where the composer opens in a dialog with that story already locked in and posting keeps you on the page. Rate-limited server-side (10 posts / rolling 10 minutes).

### 3.6 Engagement: likes, dislikes, follows, comments
- **Likes** (public) and **dislikes** (private — never shown anywhere, not even a count) are separate, mutually exclusive signals on every story.
- **Following** another reader is a real, persisted relationship; followers/following counts on a profile are tappable lists.
- **Comments** on community posts are threaded, real, and persisted.

### 3.7 Notifications (`/notifications`, linked from Profile)
In-app (polled, not push) notifications for: someone likes your post, comments on it, follows you, or your post gets credited into a story via the trend-detection mechanism. Deliberately excludes dislikes (that signal is private) and self-actions. **No push notifications exist yet** — nothing reaches the lock screen; this is the planned next major feature post-launch.

### 3.8 Safety: reporting & blocking (`src/lib/safety/*`, `/settings/blocked`)
A "⋯" menu on posts, comments, and public profiles offers Report (spam/harassment/inappropriate/misinformation/other, with optional details) and Block. Blocking is real and server-enforced — a blocked user's posts and comments are filtered out of the blocker's feeds at the query level, not just hidden client-side. `Settings → Blocked Accounts` lists and lets you unblock. Reports aren't surfaced in any admin UI yet — reviewed directly via the Supabase dashboard.

### 3.9 Account deletion (`Settings → Delete Account`)
Self-service, permanent, real account deletion — not deactivation. Deletes the Supabase Auth user (cascading through every user-owned table via foreign-key constraints) and removes any uploaded post photos from storage. Built primarily to satisfy App Store Guideline 5.1.1(v).

### 3.10 Community moderation & trend detection (backend, surfaces to readers only through its effects)
Every new community post/comment is screened by Claude — genuine policy violations (harassment, threats, doxxing, spam) are quietly hidden; strong opinions and one-sided takes are explicitly left alone. Separately, when 2+ distinct users independently make the same point about a story, the pipeline folds that point into the story and credits the contributing posts (a "Readers pointed out: …" entry, visible on the reader's own profile under "Your Impact," which also now surfaces broader well-received posts, not just the rare trend-credit case).

### 3.11 Profile (`/profile`, `/profile/[username]`)
Own profile: post count, likes-received, liked-stories, followers/following (tappable lists), a list of the reader's own posts, "Your Impact," a link to Notifications, edit-profile dialog (username/display name/bio), sign-out, delete-account. Public profile (`/profile/[username]`): the same reader-facing info for another user, plus a Follow button and the Report/Block menu.

### 3.12 Settings (`/settings`)
Account row (email, sign-out, delete account), profile-edit dialog, a working light/dark/system theme picker, Blocked Accounts, and a link to the Privacy Policy.

### 3.13 Privacy Policy (`/privacy`)
A real privacy policy page, linked from Settings and the site footer.

### 3.14 Feedback (`/feedback`)
A segmented-choice + free-text form that opens the reader's own email client via `mailto:` — no backend involved.

### 3.15 Authentication (`src/components/auth/*`)
Email + password via Supabase Auth, gated by Cloudflare Turnstile CAPTCHA on sign-up/sign-in/password reset (with an automatic fallback if Turnstile's script fails to load, so a blocked/failed CAPTCHA script never locks a real user out entirely).

### 3.16 Native iOS app
The same Next.js web app, wrapped via Capacitor into a native iOS shell that loads the live production URL directly in a WebView (no bundled/offline build — the app needs a real server for Server Actions, cookie auth, and cron routes). This means almost every web-side change ships to the native app instantly with no App Store resubmission; only genuinely native-code changes (a new Capacitor plugin, a new Xcode capability/entitlement) require a new build and review. Includes: camera/photo-library permission handling, and a native offline/connection-failure screen with a retry button (so a network hiccup shows a proper native fallback instead of a blank WebView or Safari's default error page).

### 3.17 PWA / installability
Also installable as a browser PWA independent of the native app — custom icon, web manifest, iOS "add to home screen" meta tags.

### 3.18 Theming
Full light/dark/system support via `next-themes`. In practice the app has mostly been designed/reviewed in dark mode — light mode exists and works but is less battle-tested.

---

## 4. Tech Stack

| Layer | Choice | Responsibility |
|---|---|---|
| Framework | **Next.js 16.2.10** (App Router, Turbopack) | Routing, Server/Client Components, Server Actions |
| Language | **TypeScript 5** | Whole codebase; path alias `@/* → ./src/*` |
| UI runtime | **React 19.2.4** | Component rendering |
| Native shell | **Capacitor 8.5** (iOS) | Wraps the live web app into a native iOS app — see §3.16 |
| Styling | **Tailwind CSS v4** + `tailwind-merge`, `tw-animate-css`, `class-variance-authority` | Utility-first styling, RTL logical-property support |
| UI primitives | Hand-built `src/components/ui/*` on **`@base-ui/react`** (dialogs, dropdowns), plus `sonner` (toasts), `lucide-react` (icons) | shadcn-style component library |
| Theming | **`next-themes`** | Light/dark/system mode |
| Database + Auth | **Supabase** (Postgres + Auth), via `@supabase/supabase-js` and `@supabase/ssr` | All persistent data; email/password auth, RLS-scoped reads/writes, service-role bypass for the backend pipeline |
| AI / content generation | **Anthropic Claude** (`claude-sonnet-5`), via raw `fetch()` | Clustering, story generation, dedup, coverage/trend-update detection, moderation, image-keyword derivation, vision-based photo moderation |
| Embeddings | **Voyage AI** (`voyage-3-lite`), via raw `fetch()` | Similarity-based related-story retrieval (see §2) |
| RSS ingestion | **`fast-xml-parser`** | RSS/Atom/RDF feeds from Hebrew/Israeli sources (plus several Telegram channels) |
| Stock photography | **Pexels API** | One photo per story, vision-checked to reject images with legible signage/text |
| Transactional email | **Resend** | Pipeline summary/alert emails, new-signup notification, moderation alerts |
| Bot protection | **Cloudflare Turnstile** | CAPTCHA on sign-up/sign-in/password-reset |
| Hosting | **Vercel** | App hosting + lower-frequency cron jobs |
| Scheduled jobs (higher-frequency) | **GitHub Actions** | `process-articles` (every 3h), `check-trends` (every 2h) |
| Dev/test runner for pipeline scripts | **`ts-node`** (CommonJS/Node10 override) | Running `scripts/*.ts` outside Next's own bundler — a real constraint that has caused real incidents (`@/` path aliases and the `server-only` package don't resolve there) |
| Linting | **ESLint 9** (flat config) | `core-web-vitals` + TypeScript presets |

---

## 5. Data Model

All tables are Postgres/Supabase with Row Level Security enabled. 27 migrations as of this writing (`supabase/migrations/`). Rather than reproduce every column (see the migrations directly for exact schema), the tables in play by area:

- **Content**: `stories`, `posts` (AI-seeded reactions), `story_updates` (the "How this story developed" log), `raw_articles`/`pipeline_runs` (backend-only pipeline staging/audit, never exposed to clients).
- **Community**: `community_posts`, `community_post_likes`, `community_post_comments`, `post_contributions` (what a reader-trend update changed and which posts drove it).
- **Social**: `follows`, `bookmarks`, `story_dislikes`.
- **Safety/compliance**: `user_blocks`, `content_reports`, `profiles.approval_status` (now always `approved` on signup — see §1).
- **Notifications & analytics**: `notifications`, `page_views` (insert-only from any client; a narrow policy lets a user read back their *own* rows, used to compute "new since last visit").
- **Search infra**: `stories.embedding` (pgvector) for similarity-based related-story matching.

`src/lib/supabase/database.types.ts` is a hand-written mirror of the schema (not auto-generated) — kept in sync manually whenever a migration adds/changes a column used by typed queries; a few backend-only tables (`raw_articles`, `pipeline_runs`) are deliberately excluded since they're only ever queried with untyped service-role clients.

---

## 6. API Routes

All under `src/app/api/`, all gated by `CRON_SECRET` where relevant (cron routes) or by normal Supabase auth (webhook/tracking routes). Everything else that mutates data is a Next.js Server Action, not a route handler.

- `GET /api/cron/fetch-rss` — pulls fresh RSS into `raw_articles`. Vercel cron, daily.
- `GET /api/cron/process-articles` — full pipeline (cluster → generate/update → dedup → cap enforcement). Not on Vercel cron (exceeds Hobby's timeout); real schedule is GitHub Actions, every 3h.
- `GET /api/cron/check-trends` — moderates new posts/comments, folds in reader-convergent points. GitHub Actions, every 2h.
- `GET /api/cron/check-pipeline-health` — checks for a stale pipeline heartbeat; re-triggers the GitHub workflow and emails an alert if so. Vercel cron, daily.
- `POST /api/track-view` — logs a page view (path + optional user id) for analytics.
- `POST /api/webhooks/new-signup` — called by a Postgres trigger on every new signup; emails the owner.

---

## 7. Known Limitations / Not Yet Built

- **No push notifications.** In-app notifications work; nothing reaches the lock screen. Deliberately deferred to a post-launch update, specifically to avoid complicating the current App Store review with new native capabilities.
- **No Android app.** iOS only.
- **Post replies (distinct from comments) are not persisted** — a UI stub shows a "coming soon" toast.
- **No profile photo upload** — every avatar is a colored-circle initial.
- **No desktop-optimized layout** — mobile-first and in practice mobile-only; a desktop visitor gets the same narrow column, not a real wide-screen design.
- **No in-app admin UI for content reports** — reviewed directly via the Supabase dashboard.
- **No English-mode content pipeline currently running** — the reversible `LOCALE` toggle and English source list/seed data still exist and work, but there's no live English deployment today.
- **No automated test suite** — correctness is established by direct manual/live verification against real production data, documented in the project's own development history, rather than an automated test runner.
- **`README.md`** is a short pointer to this document plus setup instructions — kept intentionally brief, not a full feature list.

---

## 8. Environment Variables & Setup

### Required to run locally

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Where to get it | Required for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API | Everything — database and auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API | Backend pipeline scripts only — never expose to the client |
| `CRON_SECRET` | `openssl rand -hex 32` | Authorizing the `/api/cron/*` routes |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Story generation, clustering, dedup, trend detection, moderation |
| `VOYAGE_API_KEY` | voyageai.com | Related-story similarity search (see §2) — degrades gracefully to a recency-based fallback if unset |
| `RESEND_API_KEY` + `NOTIFICATION_EMAIL` | resend.com (free tier) | Pipeline/signup/moderation emails — both must be set or emails are silently skipped |
| `PEXELS_API_KEY` | pexels.com/api (free) | Story photos — falls back to a category icon placeholder if unset |
| `GITHUB_ACTIONS_PAT` | Fine-grained GitHub PAT (Actions: read-and-write) | Lets the health-check cron re-trigger the pipeline workflow |
| `NEXT_PUBLIC_LOCALE` | — | `"he"` for Hebrew/RTL (current live config); anything else → English/LTR |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile | Sign-up works without a CAPTCHA if unset |

### Running it

```bash
npm install
cp .env.local.example .env.local   # then fill in the values above
npm run dev                        # app at localhost:3000
```

To exercise the content pipeline locally (writes to the real configured Supabase project):

```bash
npm run fetch-rss                    # Stage 1: pull fresh RSS into raw_articles
npm run process-articles             # Stage 2: cluster + generate/update stories
npm run check-trends                 # Stage 3: moderate posts/comments + fold in reader trends
npm run backfill-images              # maintenance: catch up missing story photos
npm run backfill-story-embeddings    # one-time: embed existing stories for similarity search
```

### Production deployment topology

- **App + 2 crons** (`fetch-rss`, `check-pipeline-health`, both daily) run on **Vercel**.
- **2 higher-frequency crons** (`process-articles` every 3h, `check-trends` every 2h) run on **GitHub Actions**, since Vercel Hobby only supports daily cron frequency and a full pipeline run exceeds its serverless timeout.
- The **native iOS app** loads the same Vercel-hosted production URL directly — no separate native deployment pipeline.
- Both surfaces read from and write to the **same Supabase project** — no separate staging database.
