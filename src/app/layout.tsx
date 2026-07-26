import type { Metadata } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { SiteShell } from "@/components/layout/site-shell";
import { createClient } from "@/lib/supabase/server";
import { getBookmarkedSlugs } from "@/lib/bookmarks/get-bookmarks";
import { getCommunityPosts } from "@/lib/posts/get-community-posts";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "FullScope — Understand the story, not just the headline",
    template: "%s — FullScope",
  },
  description:
    "FullScope groups the news into Stories: verified facts, timelines, multiple perspectives, and public reaction in one place.",
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
  const initialBookmarkedSlugs = user ? await getBookmarkedSlugs() : [];
  const initialCommunityPosts = await getCommunityPosts();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sourceSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
        >
          Skip to content
        </a>
        <Providers
          initialUser={user}
          initialBookmarkedSlugs={initialBookmarkedSlugs}
          initialCommunityPosts={initialCommunityPosts}
        >
          <SiteShell>{children}</SiteShell>
        </Providers>
      </body>
    </html>
  );
}
