import { Skeleton } from "@/components/ui/skeleton";
import { StoryListSkeleton } from "@/components/shared/story-list-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-10" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-5 w-32" />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-4">
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3.5 w-24" />
          </div>
        </div>
        <Skeleton className="h-3.5 w-full" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
      </div>

      <StoryListSkeleton count={2} />
    </div>
  );
}
