# FullScope

An AI-powered news platform organized around Stories instead of individual articles. Each Story Page brings together a summary, verified facts, a timeline, two perspectives, public reactions, and sources in one place.

This is the mobile-first MVP, built with Next.js and using local seed data (no live news ingestion yet).

## Running it locally

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Data

All content comes from `fullscope-seed-july23.md`, parsed once into `src/lib/data/seed-stories.json` and `src/lib/data/seed-standalone-posts.json` by `scripts/parse-seed.mjs`. The app reads those JSON files through `src/lib/repositories` and `src/lib/services` — the only two places that would need to change if this were later replaced with a live API.

## Bookmarks

Bookmarks are stored in the browser's local storage (`src/lib/bookmarks`) — no account or server required. They persist per device/browser.
