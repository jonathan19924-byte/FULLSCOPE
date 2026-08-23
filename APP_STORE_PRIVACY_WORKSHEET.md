# App Store Connect — App Privacy worksheet

Reference for filling out App Store Connect → your app → App Privacy → "Get
Started". This is not something Claude can submit for you — it's inside your
authenticated Apple Developer account — so this maps each of Apple's
questions to what the code actually does, verified against the source
(Supabase tables, server actions, and the native iOS shell) as of this
writing.

**Privacy Policy URL to enter:** `https://fullscope-eight.vercel.app/privacy`

## Does your app collect data from this app?

**Yes.**

## Data types to declare

Apple's flow asks you to pick data types, then for each one: whether it's
linked to the user's identity, and whether it's used to track them across
other companies' apps/websites. None of FullScope's data is used for
tracking (no ad SDK, no IDFA/AdSupport usage anywhere in the codebase), so
every category below answers "Used for Tracking: No."

| Apple category | Specific type | Linked to identity? | Used for tracking? | Purpose(s) | Where in the code |
|---|---|---|---|---|---|
| Contact Info | Email Address | Yes | No | App Functionality | Supabase Auth (sign-up/sign-in) |
| Identifiers | User ID | Yes | No | App Functionality | `auth.users.id`, used throughout (posts, follows, blocks) |
| Identifiers | Device ID | Yes | No | App Functionality | Push notification tokens — `device_tokens` table (`supabase/migrations/0030_device_tokens.sql`), tied to `user_id`, used only to deliver push notifications. Added to the live App Store Connect declaration on 2026-08-19; this row was missing from that declaration for a while after push notifications shipped — worth double-checking Data Types in App Store Connect matches this table whenever a new declaration-affecting feature is added. |
| User Content | Photos or Videos | Yes | No | App Functionality | Post attachments — [media-moderation.ts](src/lib/posts/media-moderation.ts) |
| User Content | Other User Content | Yes | No | App Functionality | Post/comment text — [actions.ts](src/lib/posts/actions.ts) |
| Usage Data | Product Interaction | Yes | No | Analytics | Page-view tracking — [page_views table](supabase/migrations/0018_page_views.sql), nullable `user_id` |

## Data types that do NOT apply — leave unchecked

- **Location** (none collected)
- **Financial Info** (no payments/subscriptions in the app)
- **Health & Fitness**
- **Contacts**
- **Browsing/Search History** (in-app search filters an already-fetched public story list client-side — nothing is sent to the server as a search query)
- **Diagnostics** (no crash-reporting or analytics SDK is linked — confirmed against `package.json`)
- **Purchases**
- **Sensitive Info**

## One thing to get right: Cloudflare Turnstile does NOT apply here

The website's sign-in form uses Cloudflare Turnstile (a bot/CAPTCHA check),
but it's explicitly disabled inside the native app —
[`isNativeApp()`](src/lib/capacitor.ts) gates it off, and the native sign-in
path (`nativeSignInAction`) bypasses it entirely. Apple's questionnaire asks
about data the **app** collects, so don't declare anything for Turnstile —
it never runs inside the iOS build.

## App Tracking Transparency (ATT)

**Not required.** Since nothing is declared as "Used for Tracking," you do
not need to implement the ATT permission prompt (`AppTrackingTransparency`
framework) or add `NSUserTrackingUsageDescription` to Info.plist.

## Third parties whose data handling you're vouching for

Apple also asks who else can access the data. The truthful list, matching
[the Privacy Policy](src/app/privacy/page.tsx):

- **Supabase** — auth, database, storage (photos)
- **Vercel** — hosting
- **Anthropic** — receives uploaded photos, for the automated content check ([media-moderation.ts](src/lib/posts/media-moderation.ts)); also receives post/comment text for automated content moderation ([moderation.ts](src/lib/articles/moderation.ts), pre-existing but missing from this list until now), for the story-link auto-detect feature ([detect-related-story.ts](src/lib/posts/detect-related-story.ts)), and for classifying which side of a story's two perspectives a post leans toward ([classify-post-perspective.ts](src/lib/posts/classify-post-perspective.ts)). All are automated judgments about a post's content, not third-party profiling of the user.
- **Resend** — sends one internal email to the developer's own inbox when someone signs up; never emails end users

## Sign in with Apple / Google (added 2026-08)

Both are live (`@capgo/capacitor-social-login`). No new data type needed
here — both still resolve to the same Email Address + User ID rows already
declared above, just via a different auth provider. Sign in with Apple's
presence also satisfies Guideline 4.8, which the note below anticipated
before it became relevant.

## If any of this changes later

Re-visit this worksheet whenever you add a new SDK, a new third-party
service, or a new category of stored identifier — the Device ID row above
is a concrete example of exactly this kind of gap (push notifications
shipped before this worksheet caught up), and any ad SDK would flip the
"Used for Tracking" answers throughout.
