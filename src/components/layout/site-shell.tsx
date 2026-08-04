import { NavBar } from "./nav-bar";
import { MobileTabBar } from "./mobile-tab-bar";
import { Footer } from "./footer";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      {/* Top safe-area padding only matters where NavBar is hidden (mobile)
       * — NavBar's own height already clears the notch on desktop, and
       * env(safe-area-inset-top) resolves to 0 there anyway. See the
       * viewportFit comment in layout.tsx for why this needs that set. */}
      <main id="main-content" className="flex-1 pt-[env(safe-area-inset-top)] pb-20 md:pt-0 md:pb-0">
        {children}
      </main>
      <Footer />
      <MobileTabBar />
    </>
  );
}
