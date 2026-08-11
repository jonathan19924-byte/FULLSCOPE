import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-10" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-8 w-28" />
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-20" />
        <div className="flex flex-col divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
          <Skeleton className="m-4 h-9 rounded-lg" />
          <Skeleton className="m-4 h-9 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-24" />
        <div className="flex flex-col divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
          <Skeleton className="m-4 h-9 rounded-lg" />
          <Skeleton className="m-4 h-9 rounded-lg" />
          <Skeleton className="m-4 h-9 rounded-lg" />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-3.5 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-16 flex-1 rounded-xl" />
          <Skeleton className="h-16 flex-1 rounded-xl" />
          <Skeleton className="h-16 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
