export function KeyDifferences({ cause, impact }: { cause: string; impact: string }) {
  return (
    <section
      aria-labelledby="key-differences-heading"
      className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-4"
    >
      <h2 id="key-differences-heading" className="font-serif text-base font-semibold text-foreground">
        Why perspectives differ
      </h2>
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
