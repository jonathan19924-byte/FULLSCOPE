# FullScope — Design Context

A handoff document for anyone reviewing or redesigning the UI, with no prior context on the project.

---

## 1. What the app is

FullScope is a two-sided news platform. Every story is generated from multiple real news sources and presented with: a neutral factual summary, a sourced timeline, and **two distinct perspectives** on the story — named by the *argument* each side makes (e.g. "security-first response" vs. "restraint and de-escalation"), never by a political party or group label. The premise is that most news stories worth reading are actually disputed in some way, and readers should see both real sides clearly labeled and equally weighted, rather than one framing presented as neutral.

Beyond reading, there's a lightweight community layer: readers can bookmark stories, react with short posts (a Twitter-like feed), follow other users, and see reader sentiment folded back into a story when enough people independently make the same point.

The content pipeline (RSS + Telegram ingestion → Claude-based clustering, dispute detection, and story generation) runs on a schedule and is out of scope for design work — see §6.

**Distribution**: the web app (Next.js, deployed on Vercel) is also shipped as a native iOS app via Capacitor — the native shell is a thin WebView pointed at the live production URL (no bundled/offline build), so almost every web change is live in the native app immediately with no App Store resubmission needed. Only genuinely native-code changes (a new Capacitor plugin, an Xcode capability/entitlement) require a new build and review. As of this writing version 1.0 is live/approved and version 1.1 (push notifications, Sign in with Apple/Google, a camera fix, a new app icon) is submitted and awaiting approval.

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

**Navigation**: a single `NAV_ITEMS` array (`src/components/layout/nav-items.ts`) drives both the desktop top nav and the mobile bottom tab bar — five items: Home, Search, Create, Posts, Profile. Editing one editor updates both. The same file also exports `AUTH_ROUTE_PREFIXES`; both nav components hide themselves entirely on sign-in, sign-up, forgot-password, reset-password, and the auth callback route, since none of the five destinations are meaningful for a logged-out user mid-flow.

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
- **Home/History/Bookmarks lists are compact rows, not full cards.** `PaginatedStoryList` renders 92px-thumbnail rows, 10 at a time with a "show more" control, rather than the full-size `StoryCard` used at the top of the home page for the "Trending" module. The Trending module itself is wrapped in a gold-tinted bordered "card" (`color-mix()` against `--brand-gold`) purely to visually separate it from the plain "Latest" list below — deliberately without rank-number badges.
- **Engagement is split into two separate, mutually-exclusive signals**: a like (thumbs-up, formerly "bookmark" — same underlying save-for-later mechanic, relabeled) and a dislike (thumbs-down, `DislikeButton`), each clearing the other when toggled. Dislikes are intentionally never surfaced anywhere in the UI (no count, no list) — they're a private signal only, unlike likes which count toward a user's public "likes received" stat.
- **Community posts support threaded comments** (`community_post_comments`), rendered inline under each post in the Posts feed via `post-feed-card.tsx`, alongside the existing like count.
- **In-app notifications live inside the Profile page, not the primary nav.** A dedicated "Notifications" row in Profile links to `/notifications`; there's no bell icon or badge in the 5-item nav bar — this was a deliberate choice to keep the nav's fixed 5-item set intact (see above) rather than adding a 6th destination or replacing one of the five.
- **Followers/following are tappable, listing pages**, not static counts — profile stat tiles for "Followers" and "Following" link to a shared `FollowListPageClient`, reused for both the viewer's own lists and any public profile's lists.
- **Stories tied to a specific place get a map-pin icon button** in the story hero (next to like/dislike/share) that deep-links to a Google Maps search for that place name — only rendered when the pipeline has extracted a `locationName` for that story, so most stories don't show it.
- **All text inputs/textareas are held to a 16px minimum font-size**, even where the visual design calls for something smaller (several forms use `text-[15px]` elsewhere in the type scale) — anything under 16px triggers iOS Safari's automatic (and not easily reversible) zoom-on-focus, which was shipped as a real bug before this rule was established. Any new input, anywhere, should default to 16px on mobile regardless of what the surrounding text scale suggests.
- **A reader can write a post directly from the story they're reading**, not only from the standalone Create tab. The "From readers" section on every story page (even with zero posts yet) has a "Write a post" button that opens the same composer in a dialog, with that story pre-tagged and locked — posting closes the dialog and stays on the page rather than navigating away. The standalone Create tab has no manual story-picker at all anymore (it used to be a plain `<select>` of every live story) — instead, on submit the post is auto-checked for a confident match against existing stories, and only if one is found does the reader see an inline confirm-to-link prompt; an unrelated post just posts immediately.
- **Real toggle switches now exist** (`src/components/ui/switch.tsx`, wrapping `@base-ui/react`'s Switch) — used for the three notification-preference rows in Settings, which used to be a static "coming soon" badge (`DisabledToggleRow`) with no backing state. Any future settings toggle should reuse this component rather than reinventing one.
- **Account deletion, blocking, and reporting exist** (Settings → Delete Account; a "⋯" menu on posts/comments/profiles → Report/Block; Settings → Blocked Accounts) — built primarily for App Store compliance (Guideline 5.1.1(v) account deletion, Guideline 1.2 UGC safety), but they're real, working, self-service flows, not stubs. Blocking actually filters that user's posts/comments out of feeds server-side, not just client-side hiding.
- **A privacy policy page exists** (`/privacy`), linked from Settings and the footer.
- **Two badges signal a story's "liveness"**, both derived from the same `story_updates` log with different time windows: a stronger "Developing" badge (pulsing dot, ~6h window) for a story actively unfolding right now, versus the older/softer "Updated" badge (~48h window) for one that was merely touched recently. Full badge+label on story cards/hero; dot-only on the compact list rows to avoid adding text bulk to an already-dense layout.
- **Returning readers see which "How this story developed" entries are new since their last visit** — a small gold "New" chip, computed by comparing the story's update timestamps against the reader's own page-view history (signed-in only; a first-time visitor sees nothing highlighted, correctly, since everything is new to them).

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
- **The 16px-minimum-input-font rule (§4) is enforced ad hoc, not structurally.** It's applied per-input via literal `text-[16px]` classes; there's no shared input primitive that guarantees it, so a new form built by copying an older pattern (or by a future redesign that reintroduces a `text-sm`/`text-[15px]` input) can silently reintroduce the iOS auto-zoom bug. Worth consolidating into a base `Input`/`Textarea` component that owns this instead of leaving it to convention.

---

## 6. Explicitly out of scope

- **The content-generation pipeline itself** (`src/lib/articles/`, `src/lib/rss/`, RSS/Telegram ingestion, Claude-based clustering and story generation, the category-classification logic, bias/neutrality prompt engineering) — this is a backend content system, documented separately in `CONTENT_PIPELINE.md`, and isn't a UI concern.
- **Database schema / Supabase migrations** (`supabase/migrations/`) — schema changes are a backend concern; a design pass shouldn't need to touch these directly (flag data-shape needs instead of editing migrations).
- **Auth/session mechanics** (Supabase auth flow, Turnstile captcha integration, cookie handling) — the *visual* design of auth pages is in scope (see §5), but the underlying auth logic is not.
- **The locale/RTL toggle mechanism itself** — flipping the app to English/LTR is a real, working feature (not a stub), but redesign work should assume Hebrew/RTL is the active target unless told otherwise; don't build assuming LTR-only.
