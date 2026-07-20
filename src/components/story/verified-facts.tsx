import { BadgeCheck, CircleAlert, CircleHelp, Newspaper } from "lucide-react";
import type { Confidence, Fact } from "@/types/domain";
import { cn } from "@/lib/utils";

const CONFIDENCE_META: Record<
  Confidence,
  { label: string; icon: typeof BadgeCheck; className: string }
> = {
  confirmed: {
    label: "Confirmed",
    icon: BadgeCheck,
    className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  reported: {
    label: "Reported",
    icon: Newspaper,
    className: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  },
  disputed: {
    label: "Disputed",
    icon: CircleAlert,
    className: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  },
  unknown: {
    label: "Unknown",
    icon: CircleHelp,
    className: "bg-muted text-muted-foreground",
  },
};

export function VerifiedFacts({ facts }: { facts: Fact[] }) {
  if (facts.length === 0) return null;

  return (
    <section aria-labelledby="verified-facts-heading" className="flex flex-col gap-3">
      <div>
        <h2 id="verified-facts-heading" className="font-serif text-lg font-semibold text-foreground">
          Verified facts
        </h2>
        <p className="text-xs text-muted-foreground">
          Reported by named news sources. FullScope does not independently verify claims beyond what those sources state.
        </p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {facts.map((fact, i) => {
          const meta = CONFIDENCE_META[fact.confidence];
          const Icon = meta.icon;
          return (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3.5"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                  meta.className,
                )}
              >
                <Icon className="size-3.5" strokeWidth={2} />
              </span>
              <div className="flex flex-col gap-1">
                <span
                  className={cn(
                    "w-fit rounded-full px-2 py-0.5 text-[11px] font-medium",
                    meta.className,
                  )}
                >
                  {meta.label}
                </span>
                <p className="text-sm leading-relaxed text-foreground/90">{fact.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
