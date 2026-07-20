import { NavBar } from "./nav-bar";
import { MobileTabBar } from "./mobile-tab-bar";
import { Footer } from "./footer";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <main id="main-content" className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <Footer />
      <MobileTabBar />
    </>
  );
}
