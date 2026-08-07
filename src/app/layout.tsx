import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Source_Serif_4, Heebo, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SiteShell } from "@/components/layout/site-shell";
import { PendingApprovalScreen } from "@/components/auth/pending-approval-screen";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { createClient } from "@/lib/supabase/server";
import { getBookmarkedSlugs } from "@/lib/bookmarks/get-bookmarks";
import { getDislikedSlugs } from "@/lib/dislikes/get-dislikes";
import { getCommunityPosts } from "@/lib/posts/get-community-posts";
import { getFollowingIds } from "@/lib/follows/get-following";
import { getMyProfile } from "@/lib/profile/profile-repository";
import { getNotifications, getUnreadNotificationCount } from "@/lib/notifications/get-notifications";
import { DIR, LOCALE } from "@/lib/locale";
import { t } from "@/lib/i18n";

// English/LTR fonts — Latin only, no Hebrew glyph coverage.
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Hebrew/RTL fonts — same CSS variable names as above, so only one pair is
// ever actually loaded/applied per locale (see the `<html>` className below).
const heebo = Heebo({
  variable: "--font-sans",
  subsets: ["hebrew", "latin"],
});

const frankRuhlLibre = Frank_Ruhl_Libre({
  variable: "--font-serif",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bodyFont = LOCALE === "he" ? heebo : geistSans;
const headingFont = LOCALE === "he" ? frankRuhlLibre : sourceSerif;

export const metadata: Metadata = {
  title: {
    default: `FullScope — ${t.brand.tagline}`,
    template: "%s — FullScope",
  },
  description: t.brand.metaDescription,
  appleWebApp: {
    title: "FullScope",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  // Required for env(safe-area-inset-*) to resolve to real values rather
  // than 0 — without it, content can't tell the notch/Dynamic Island is
  // there at all. Matters most in the native app shell and installed PWA
  // (standalone display, no browser chrome pushing content down); a normal
  // Safari tab already keeps content clear of the notch on its own.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [
    initialBookmarkedSlugs,
    initialDislikedSlugs,
    initialCommunityPosts,
    initialFollowingIds,
    myProfile,
    initialNotifications,
    initialUnreadCount,
  ] = await Promise.all([
    user ? getBookmarkedSlugs() : Promise.resolve([]),
    user ? getDislikedSlugs() : Promise.resolve([]),
    getCommunityPosts(),
    user ? getFollowingIds() : Promise.resolve([]),
    user ? getMyProfile() : Promise.resolve(null),
    user ? getNotifications() : Promise.resolve([]),
    user ? getUnreadNotificationCount() : Promise.resolve(0),
  ]);
  const isBlocked = myProfile != null && myProfile.approvalStatus !== "approved";

  return (
    <html
      lang={LOCALE}
      dir={DIR}
      className={`${bodyFont.variable} ${geistMono.variable} ${headingFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
        >
          {t.common.skipToContent}
        </a>
        <PageViewTracker />
        <Providers
          initialUser={user}
          initialBookmarkedSlugs={initialBookmarkedSlugs}
          initialDislikedSlugs={initialDislikedSlugs}
          initialCommunityPosts={initialCommunityPosts}
          initialFollowingIds={initialFollowingIds}
          myProfile={myProfile}
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
          signedIn={Boolean(user)}
        >
          {isBlocked ? (
            <PendingApprovalScreen
              status={myProfile!.approvalStatus === "rejected" ? "rejected" : "pending"}
            />
          ) : (
            <SiteShell>{children}</SiteShell>
          )}
        </Providers>
      </body>
    </html>
  );
}
