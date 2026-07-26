import { Scale } from "lucide-react";

export function KeyDifferences({ cause, impact }: { cause: string; impact: string }) {
  return (
    <section
      aria-labelledby="key-differences-heading"
      className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/40 p-4"
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background">
          <Scale className="size-3.5 text-foreground" strokeWidth={1.75} />
        </span>
        <h2 id="key-differences-heading" className="font-serif text-lg font-semibold text-foreground">
          Why perspectives differ
        </h2>
      </div>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-foreground/90">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Root disagreement</p>
          <p>{cause}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">What it affects</p>
          <p>{impact}</p>
        </div>
      </div>
    </section>
  );
}
