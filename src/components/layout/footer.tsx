import Link from "next/link";
import { t } from "@/lib/i18n";

export function Footer() {
  return (
    <footer className="hidden md:block border-t border-border/60 mt-24">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
        <p className="font-serif text-base text-foreground">FullScope</p>
        <p>{t.brand.tagline}</p>
        <nav aria-label={t.nav.footerAria} className="flex gap-6">
          <Link href="/" className="hover:text-foreground transition-colors">
            {t.nav.home}
          </Link>
          <Link
            href="/search"
            className="hover:text-foreground transition-colors"
          >
            {t.nav.search}
          </Link>
          <Link
            href="/create"
            className="hover:text-foreground transition-colors"
          >
            {t.nav.create}
          </Link>
          <Link
            href="/posts"
            className="hover:text-foreground transition-colors"
          >
            {t.nav.posts}
          </Link>
          <Link
            href="/feedback"
            className="hover:text-foreground transition-colors"
          >
            {t.nav.feedback}
          </Link>
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            {t.privacy.title}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
