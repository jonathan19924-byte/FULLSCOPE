import { Skeleton } from "@/components/ui/skeleton";
import { StoryListSkeleton } from "@/components/shared/story-list-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-10" aria-hidden>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="size-9 rounded-full" />
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4">
        <Skeleton className="size-14 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3.5 w-40" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>

      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <StoryListSkeleton count={2} />
      </div>

      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>
    </div>
  );
}
