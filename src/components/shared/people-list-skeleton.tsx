import { Skeleton } from "@/components/ui/skeleton";

/** Shared by every "list of people" loading state — followers, following,
 * and blocked accounts all render the same avatar/name row shape. */
export function PeopleListSkeleton() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-10" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="flex flex-col divide-y divide-border/60 border-t border-border/60">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
