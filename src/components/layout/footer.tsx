import Link from "next/link";

export function Footer() {
  return (
    <footer className="hidden md:block border-t border-border/60 mt-24">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
        <p className="font-serif text-base text-foreground">FullScope</p>
        <p>Understand the story, not just the headline.</p>
        <nav aria-label="Footer" className="flex gap-6">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <Link
            href="/search"
            className="hover:text-foreground transition-colors"
          >
            Search
          </Link>
          <Link
            href="/create"
            className="hover:text-foreground transition-colors"
          >
            Create
          </Link>
          <Link
            href="/posts"
            className="hover:text-foreground transition-colors"
          >
            Posts
          </Link>
          <Link
            href="/feedback"
            className="hover:text-foreground transition-colors"
          >
            Feedback
          </Link>
        </nav>
      </div>
    </footer>
  );
}
