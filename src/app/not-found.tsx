import Link from "next/link";
import { CompassIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 pt-16 pb-10">
      <EmptyState
        icon={CompassIcon}
        title="We couldn't find this page"
        description="It may have been moved, or the link might be incorrect. Let's get you back on track."
        action={
          <Link href="/" className={buttonVariants({ variant: "default" })}>
            Back to Home
          </Link>
        }
      />
    </div>
  );
}
