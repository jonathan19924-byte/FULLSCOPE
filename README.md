# FullScope

A two-sided news platform: every story is built from multiple independent sources and shown with the two honest, named perspectives that actually divide people on it — never a single outlet's framing, never a forced left/right template. A community layer lets real readers add context, follow each other, and — when enough independent readers converge on the same point — get it folded back into the story itself.

Shipped as both a web app (this repo, on Vercel) and a native iOS app (Capacitor shell loading the same live web app — see `PRD.md` §3.16/§3.17). Currently running as a live pilot for **Hebrew-speaking Israeli readers** — a deliberately narrow market chosen to test the "genuine multi-perspective" format before a possible return to English/international content. The pivot is a reversible config toggle (`NEXT_PUBLIC_LOCALE`), not a rewrite; the English mode and source list still exist underneath.

See [`PRD.md`](./PRD.md) for the full product requirements document — every feature, the database schema, all API routes, user flows, and known limitations, all traced directly to the code.

## Running it locally

```bash
npm install
cp .env.local.example .env.local   # fill in the values below
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.local.example` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase project (Settings → API)
- `CRON_SECRET` — any random string (`openssl rand -hex 32`), authorizes the `/api/cron/*` routes
- `ANTHROPIC_API_KEY` — powers the content pipeline (clustering, story generation, moderation, trend detection)
- `VOYAGE_API_KEY` — embeddings for similarity-based related-story matching (optional — falls back to a recency-based check if unset)
- `RESEND_API_KEY` + `NOTIFICATION_EMAIL` — pipeline summary/alert emails (optional — skipped if unset)
- `PEXELS_API_KEY` — story photos (optional — falls back to a category icon if unset)
- `GITHUB_ACTIONS_PAT` — lets the health-check cron re-trigger the GitHub Actions pipeline if it silently misses a run
- `NEXT_PUBLIC_LOCALE` — `he` for Hebrew/RTL (current live config); anything else falls back to English/LTR
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — Cloudflare Turnstile site key (optional — sign-up works without a CAPTCHA if unset)

## Data

Real content is live: an AI pipeline fetches RSS from ~35 Hebrew/Israeli sources (or ~31 English sources in English mode), clusters same-event coverage requiring 2+ independent sources, and has Claude generate each story (timeline, two named perspectives, sources) — all backed by Supabase Postgres, not static files.

```bash
npm run fetch-rss          # Stage 1: pull fresh RSS into raw_articles
npm run process-articles   # Stage 2: cluster + generate/update stories
npm run check-trends       # Stage 3: moderate posts + fold in reader trends
npm run backfill-images    # maintenance: catch up missing story photos only
npm run backfill-story-embeddings  # one-time: embed existing stories for similarity search
```

In production, `fetch-rss` and a pipeline health-check run on Vercel cron (daily); `process-articles` (every 3h) and `check-trends` (every 2h) run on GitHub Actions, since Vercel's Hobby plan only supports daily cron frequency and a full pipeline run exceeds its serverless timeout.

A static English seed set (`fullscope-seed-july23.md`, parsed by `scripts/parse-seed.mjs` into `src/lib/data/*.json`) still exists and is merged in — but only when `NEXT_PUBLIC_LOCALE` is *not* `he`. In the current Hebrew configuration, every story on the site is real, pipeline-generated content.

## Accounts, community, and safety

All real and server-backed via Supabase Auth + Postgres, not local-only: email/password sign-up (Turnstile CAPTCHA), bookmarks/likes/dislikes, real reader posts and threaded comments (rate-limited, moderated by Claude), following other readers, in-app notifications (no push yet), reporting/blocking, and self-service account deletion. See `PRD.md` for the full list.
