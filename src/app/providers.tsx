"use client";

import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { BookmarksProvider } from "@/lib/bookmarks/bookmarks-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider delay={200}>
        <BookmarksProvider>
          {children}
          <Toaster position="bottom-center" />
        </BookmarksProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
