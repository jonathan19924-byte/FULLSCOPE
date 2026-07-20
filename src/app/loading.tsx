import { Skeleton } from "@/components/ui/skeleton";
import { StoryListSkeleton } from "@/components/shared/story-list-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-8">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-12 w-full rounded-full" />
      <Skeleton className="h-9 w-full rounded-full" />
      <StoryListSkeleton />
    </div>
  );
}
