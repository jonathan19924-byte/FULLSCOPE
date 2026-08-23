# FullScope — Editorial Direction Scoping

A scoping doc for a possible visual-language pass, written after a full page-by-page UI/UX review and a design-system check against the `ui-ux-pro-max` skill's style/color/typography data. Not started — this is the plan to review before any of it gets built.

---

## 1. Where the app is today

Confirmed by reading `src/app/globals.css` directly: FullScope's dark theme already matches the skill's **"Modern Dark (Cinema Mobile)"** archetype closer than expected —

| Current token | Value | Matches spec? |
|---|---|---|
| `--background` (dark) | `oklch(0.145 0 0)` | Already avoids pure black (`#000`) — good, this is the #1 thing that archetype warns about (OLED smear) |
| `--border` (dark) | `oklch(1 0 0 / 10%)` | Near-identical to the spec's `rgba(255,255,255,0.08)` hairline |
| `--radius` | `0.625rem` (10px base) → `18px` at the `2xl` step used on cards | Close to the spec's `border-radius: 16` |
| `--brand-gold` | `#c69963` | Already exists as a defined accent token — but only used on the "Trending Now" module, nowhere else |

So the *foundation* is closer to a validated "premium dark" spec than the flat, generic read suggested at a glance. The gap isn't the tokens — it's that **every surface uses the same one visual unit** (rounded-2xl bordered card), and the one brand accent that exists (`--brand-gold`) is confined to a single module instead of carrying the brand.

---

## 2. Two directions, with concrete values

### Option A — Quieter Premium Dark (low risk, small diff)

Tunes what's already there rather than replacing it. Grounded in the skill's "Modern Dark (Cinema Mobile)" style entry.

| Token | Current | Proposed | Why |
|---|---|---|---|
| `--background` (dark) | `oklch(0.145 0 0)` flat | Subtle gradient, `oklch(0.145 0 0)` → `oklch(0.09 0 0)` top-to-bottom | Spec explicitly calls for gradient depth over flat black |
| Brand accent | `--brand-gold: #c69963`, used once | Promote to app-wide accent — active nav state, links, focus rings, primary CTA | Gives the brand a color signature outside category tags |
| `--radius-2xl` (cards) | `18px` | Unchanged, or `16px` to match spec exactly | Already close enough |
| `--border` (dark) | `oklch(1 0 0 / 10%)` | Unchanged | Already matches |

**Effort**: small. Mostly `globals.css` + wiring the gold accent into a handful of active/interactive states that currently use plain `foreground`/`accent`. No component restructuring.

### Option B — Editorial Austerity (bigger lift, more distinctive)

Grounded in two independent skill matches that converged on the same idea: the **Magazine/Blog color entry** ("Editorial black + accent pink") and the **News Editorial typography pairing**.

| Token | Current | Proposed | Source |
|---|---|---|---|
| New accent | *(none — only category colors + underused gold)* | Pink/magenta family, e.g. Tailwind `pink-500` equivalent `#EC4899` ≈ `oklch(0.656 0.241 354)` | Skill's Magazine/Blog palette: `#18181B` primary + `#EC4899` accent, "Editorial black + accent pink" |
| `--card` (dark) | `oklch(0.205 0 0)` | Keep near-black but flatten — reduce the background↔card lightness gap so cards read as *structure* (rules) not *containers* (boxes) | Supports moving from card-in-card to bordered list rows |
| `--radius-2xl` / `--radius-xl` (cards, inputs) | `18px` / `14px` | `4–6px` | Sharper corners = editorial, not SaaS |
| `--radius-full` (avatars, pills, tab bar) | pill | **Unchanged** | Keep — mobile-native convention, not part of the "generic" problem |
| Heading weight/size (story titles) | `font-serif` class, but currently resolves to Heebo (see below), existing scale | Bump size/weight one step for story titles and section headers specifically | Skill's "News Editorial" (Newsreader/Roboto) pairing — a serif/sans structural split, which the app no longer has (see below) |
| Section dividers | `<Separator />`, used in 3 places (added this session) | Extend as the *primary* structural device — full-bleed hairline rules between sections instead of nested card borders | Directly replaces card-in-card |

**Update since this was written**: Frank Ruhl Libre was dropped from headings entirely (readers found it hard to read) — Hebrew mode now uses Heebo for both headings and body, single-font, no serif/sans split. This undercuts the premise above ("same structural idea as the current pairing") — there's no active pairing to extend anymore. Frank Ruhl Libre's loading code and CSS variable slot still exist unused, so it (or another Hebrew-capable serif) could still be reintroduced for headings specifically if this option is pursued, but that decision should be treated as re-opening the font question, not just "pushing the serif harder" on something already live.

**Constraint confirmed via the skill**: its boldest editorial typography option (Playfair Display + Source Serif 4 + JetBrains Mono, fully brutalist) has **no Hebrew glyph coverage** — not usable as-is since the app is Hebrew/RTL by default. Frank Ruhl Libre remains one of the few dramatic serifs with genuine Hebrew support if a heading serif is wanted again, but see the note above before assuming it's still "the current anchor."

**Effort**: larger. Touches the token layer plus every component using `rounded-2xl`/`rounded-xl`/`bg-card`/`border-border` — counted directly against the codebase:

| Pattern | Files using it |
|---|---|
| `rounded-2xl` | 15 |
| `rounded-xl` | 17 |
| `border-border` | 37 |
| `bg-card` | 11 |
| `rounded-full` (mostly stays as-is) | 43 |

---

## 3. Phased plan (applies to either option, B needs all phases; A mostly stops after Phase 0)

**Phase 0 — Foundation tokens.** Edit `globals.css` only: background treatment, accent color, radius scale, border. Fast, reversible, nothing else depends on it being "final" yet.

**Phase 1 — Core visual unit replatform** *(Option B only)*: story cards (`story-card.tsx`, `most-discussed.tsx`, compact list variant), post feed cards, profile/settings/notification rows (→ bordered list rows instead of individual boxes), stat tiles.

**Phase 2 — Page composition** *(Option B only)*: home page (extends the divider work already shipped this session), story detail page, auth pages (separately flagged as needing a visual-identity pass regardless of which option).

**Phase 3 — Polish** *(optional, either option)*: icon treatment consistency, whether any motion fits the chosen direction.

---

## 4. Risks, either option

- **RTL**: any directional accent (e.g. a left-edge color bar replacing a badge pill) must use logical properties (`border-start`, not `border-left`) — the app is Hebrew/RTL by default and this is an easy, silent way to break it.
- **Both themes**: light mode was checked once and held up, but needs re-verification after any token change.
- **Touch targets**: sharper/denser rows must not drop below 44px tap size.
- **Category colors will read louder** against a starker base (Option B especially) — the 9-color badge system will likely need re-tuning, probably toward a thin accent-bar treatment instead of a filled pill, so it doesn't look gaudy against more austere structure.
- **One coordinated pass, not incremental drips** — a half-migrated app (some pages sharp, some still rounded) reads as broken, not redesigned. Recommend a branch/PR for review before merge, given the blast radius.

---

## 5. Open decision

**A (quieter premium dark) vs. B (editorial austerity)?** A is near-zero risk and mostly validates/tunes what's already there. B is a real, coordinated redesign — more distinctive and more aligned with the "not just the headline" premise, but touches ~40+ files and needs the branch/PR workflow given a revert-after-live concern was already raised.

*Sources: `ui-ux-pro-max` skill — `style` domain ("Dark Mode (OLED)," "Modern Dark (Cinema Mobile)," "Minimalist Monochrome Editorial"), `color` domain ("Magazine/Blog," "News/Media Platform"), `typography` domain ("News Editorial," "Minimalist Monochrome Editorial"). Codebase facts verified directly against `src/app/globals.css` and `grep` counts, not assumed.*
