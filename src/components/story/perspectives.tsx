import type { Perspective } from "@/types/domain";

function PerspectiveCard({ label, perspective }: { label: string; perspective: Perspective }) {
  return (
    <article className="flex flex-1 flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <h3 className="font-serif text-lg font-semibold text-foreground">
          {perspective.name}
        </h3>
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">{perspective.summary}</p>
      {perspective.claims.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3">
          <span className="text-xs font-medium text-muted-foreground">Key claims</span>
          <ul className="flex flex-col gap-1.5">
            {perspective.claims.map((claim, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/40" aria-hidden />
                {claim}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

export function Perspectives({
  perspectiveA,
  perspectiveB,
}: {
  perspectiveA: Perspective;
  perspectiveB: Perspective;
}) {
  return (
    <section aria-labelledby="perspectives-heading" className="flex flex-col gap-3">
      <h2 id="perspectives-heading" className="font-serif text-lg font-semibold text-foreground">
        Two perspectives
      </h2>
      <div className="flex flex-col gap-4 lg:flex-row">
        <PerspectiveCard label="Perspective A" perspective={perspectiveA} />
        <PerspectiveCard label="Perspective B" perspective={perspectiveB} />
      </div>
    </section>
  );
}
