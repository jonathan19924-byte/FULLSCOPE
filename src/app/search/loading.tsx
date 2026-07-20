import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-4 pt-6 pb-8">
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}
