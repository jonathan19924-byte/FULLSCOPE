# FullScope — Design Context

A handoff document for anyone reviewing or redesigning the UI, with no prior context on the project.

---

## 1. What the app is

FullScope is a two-sided news platform. Every story is generated from multiple real news sources and presented with: a neutral factual summary, a sourced timeline, and **two distinct perspectives** on the story — named by the *argument* each side makes (e.g. "security-first response" vs. "restraint and de-escalation"), never by a political party or group label. The premise is that most news stories worth reading are actually disputed in some way, and readers should see both real sides clearly labeled and equally weighted, rather than one framing presented as neutral.

Beyond reading, there's a lightweight community layer: readers can bookmark stories, react with short posts (a Twitter-like feed), follow other users, and see reader sentiment folded back into a story when enough people independently make the same point.

The content pipeline (RSS + Telegram ingestion → Claude-based clustering, dispute detection, and story generation) runs on a schedule and is out of scope for design work — see §6.

**Locale**: the app currently runs in Hebrew (RTL) for an Israeli audience, via a `LOCALE` environment toggle that can flip the whole app (content sources, UI strings, layout direction, fonts) back to English/LTR. Every screen you review will be in Hebrew, right-to-left, unless that toggle is changed.

---

## 2. Tech stack

- **Framework**: Next.js 16 (App Router, Turbopack), React 19, TypeScript.
- **Styling**: Tailwind CSS v4, CSS-first config (no `tailwind.config.js` — theme tokens, colors, and radii are all defined directly in `src/app/globals.css` via `@theme inline` and CSS custom properties). Uses `oklch()` color values throughout, and Tailwind's `dark:` variant plus a `.dark` class (toggled by `next-themes`) for dark mode.
- **Component primitives**: `@base-ui/react` (unstyled, accessible primitives — Dialog, Avatar, Input, Tooltip, etc.) wrapped in a local shadcn-style `src/components/ui/` layer, styled with `class-variance-authority` + `tailwind-merge` (`cn()` helper).
- **Icons**: `lucide-react`, used consistently across nav, category badges, and inline UI.
- **Animation**: `framer-motion` (limited use so far), `tw-animate-css` for utility-class transitions.
- **Toasts**: `sonner`.
- **Backend**: Supabase (Postgres, Auth, RLS) via `@supabase/ssr` (separate browser/server client helpers) and `@supabase/supabase-js` (service-role, backend-only pipeline scripts).
- **Auth**: Supabase email/password, gated by Cloudflare Turnstile (captcha) on sign-up, sign-in, and password reset.
- **Fonts**: locale-dependent, loaded via `next/font/google`, both pairs always bundled but only one applied per locale:
  - English/LTR: Geist (sans/body), Source Serif 4 (headings/serif).
  - Hebrew/RTL (**currently active**): Heebo (sans/body), Frank Ruhl Libre (headings/serif) — both have native Hebrew glyph coverage.
- **RTL**: handled via Tailwind's logical-property utilities (`ps-`/`pe-`/`ms-`/`me-`/`start-`/`end-` instead of physical `left/right`) and the `rtl:` variant, driven by `dir="rtl"` on `<html>`. No RTL-specific CSS overrides exist outside these utilities.
- **i18n**: a hand-maintained string dictionary (`src/lib/i18n/strings.ts`), not a library — every UI string (including aria-labels) has an English and Hebrew entry, selected by the `LOCALE` toggle.

---

## 3. Project structure

```
src/
  app/                      # Next.js App Router — one folder per route
    page.tsx                # Home feed
    story/[slug]/           # Story detail page
    posts/                  # Community posts feed
    search/                 # Story + people search
    profile/                # Own profile (settings-adjacent) + profile/[username] (public)
    settings/, create/, bookmarks/, feedback/
    sign-in/, sign-up/, forgot-password/, reset-password/, auth/callback/
    api/cron/               # Scheduled pipeline endpoints (not UI)

  components/
    ui/                     # Low-level primitives (Button, Dialog, Avatar, Input, Tabs, …)
    layout/                 # Nav bar (desktop top nav), mobile bottom tab bar, site shell, footer
    story/                  # Story card, hero, timeline, perspectives, category filter
    posts/                  # Post feed card, composer, feed list
    profile/, settings/, search/, auth/, bookmarks/, feedback/, shared/

  lib/
    i18n/                   # strings.ts (en/he dictionaries) + t export
    category.ts             # CATEGORY_META — icon + color classes per story category
    locale.ts                # LOCALE / DIR (rtl|ltr) toggle, read from env
    supabase/                # client.ts (browser), server.ts (server components/actions)
    articles/                # Content pipeline (clustering, story generation) — NOT UI
    rss/                     # RSS + Telegram ingestion — NOT UI
    posts/, bookmarks/, follows/, profile/, auth/   # Client-side context providers + server actions per feature
    repositories/, services/ # Data-fetching layer between Supabase and the UI

  types/domain.ts            # Core domain types (Story, Category, CommunityPost, PublicProfile, …)

supabase/migrations/         # Numbered SQL migrations (schema history)
CONTENT_PIPELINE.md          # Design notes for the content-generation pipeline (separate concern, see §6)
```

**Navigation**: a single `NAV_ITEMS` array (`src/components/layout/nav-items.ts`) drives both the desktop top nav and the mobile bottom tab bar — five items: Home, Search, Create, Posts, Profile. Editing one editor updates both.

---

## 4. Key design/UX decisions made so far

- **Mobile-first, and in practice mobile-only today.** Every screen is designed and tested at a mobile viewport (`max-w-2xl` centered column). On a real desktop-width viewport, the same narrow column just sits in the middle of the screen with large empty margins on both sides — there is no wide-screen layout, sidebar, or multi-column arrangement. This was never deliberately designed for desktop; if desktop matters, it needs real design attention, not just "it technically renders."
- **Perspective neutrality is the core design constraint, not just a content rule.** Two concrete UI decisions exist specifically to prevent the two-sided format from ever looking lopsided:
  - The two perspective cards use the **same lightness and chroma**, differing only in hue (`--perspective-a` / `--perspective-b`, a cool vs. warm neutral gray) — deliberately so neither side visually reads as "winning" or as the more prominent color.
  - Perspective names are required to match each other in register and specificity (e.g. not one side named by a punchy argument and the other by a bland label) — this is enforced in content generation, but it means the UI should never editorialize further by, say, giving one card more visual weight than the other.
- **Category color system**: 9 categories (expanded from an original 4), each with a dedicated hue defined as CSS custom properties in `globals.css` (`--politics`, `--security`, `--law`, `--crime`, `--world`, `--business`, `--technology`, `--science`, `--society`, each with a paired `-bg` tint). Used for badges, card accents, and hero gradients via `CATEGORY_META` in `src/lib/category.ts`. With 9 colors now in rotation, whether they stay visually distinct enough at small sizes (chips, icons) hasn't been stress-tested.
- **RTL is handled structurally, not with one-off overrides.** The layout skeleton (nav, tab bar, footer) mirrors automatically via flexbox + logical properties; only a handful of components needed explicit `rtl:` treatment (e.g. an arrow icon that needs to visually point the other way). New components should default to logical properties (`ps-`/`pe-`/`start-`/`end-`) rather than `pl-`/`pr-`/`left-`/`right-`, or they will silently break when the app is Hebrew.
- **Collapsible category lists over infinite scroll or full display.** Both places that list all 9 categories (home page filter, profile "content preferences") show a handful by default plus a "More ▾" toggle, rather than a horizontally-scrolling strip or dumping all 9 chips at once. This is a fresh pattern (added when categories expanded from 4→9) — the app doesn't have an established "show more" component to reuse.
- **Bottom tab bar (mobile) / top nav (desktop) is a fixed 5-item set.** There's no overflow menu or secondary nav; adding a 6th destination means either replacing one of the five or rethinking the nav shape entirely.
- **Dark mode exists via `next-themes`** (a toggle is present in the nav), but in practice the app has essentially only been reviewed and iterated on in dark mode — treat light mode as present but unverified.
- **Story cards are intentionally information-dense**: hero image, up to three overlapping badge pills (bookmark, "added today"/"updated," category), title, and a summary excerpt, all before the two-perspective breakdown further down the story page. This was not a deliberate minimalism choice — it grew feature-by-feature — so there's real room to reconsider density here specifically.

---

## 5. Known issues / things already flagged as unfinished

- **No real desktop layout** (see §4) — the single biggest known gap if desktop is in scope at all.
- **Home page category filter row is visually busy**: nine unevenly-worded pills plus "All" plus a "More" toggle, all before any actual content, on the page every session starts on.
- **Story cards are heavy on mobile** — a lot of vertical space per card, which slows down scanning multiple stories in the feed.
- **Posts feed is visually flat/dense** — a long list of near-identical text cards (avatar, name, handle, timestamp, text, counts) with little rhythm to break it up.
- **Auth pages (sign-in/up, password reset) are generic, unstyled forms** — functionally solid, no visual identity applied yet.
- **Light mode is unverified** — exists mechanically, hasn't been reviewed.
- **Profile avatars are text-initials only** — no image upload exists yet, so every user-facing avatar is a colored circle with initials. Any redesign of profile/post UI should assume this stays true for the foreseeable future, not design around real avatar photos.
- **The home page "Trending now" module and story cards both render several category-colored icon badges in close proximity** — this hasn't been specifically checked for visual noise now that there are 9 category colors instead of 4.

---

## 6. Explicitly out of scope

- **The content-generation pipeline itself** (`src/lib/articles/`, `src/lib/rss/`, RSS/Telegram ingestion, Claude-based clustering and story generation, the category-classification logic, bias/neutrality prompt engineering) — this is a backend content system, documented separately in `CONTENT_PIPELINE.md`, and isn't a UI concern.
- **Database schema / Supabase migrations** (`supabase/migrations/`) — schema changes are a backend concern; a design pass shouldn't need to touch these directly (flag data-shape needs instead of editing migrations).
- **Auth/session mechanics** (Supabase auth flow, Turnstile captcha integration, cookie handling) — the *visual* design of auth pages is in scope (see §5), but the underlying auth logic is not.
- **The locale/RTL toggle mechanism itself** — flipping the app to English/LTR is a real, working feature (not a stub), but redesign work should assume Hebrew/RTL is the active target unless told otherwise; don't build assuming LTR-only.
