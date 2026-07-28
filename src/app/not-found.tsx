import Link from "next/link";
import { CompassIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 pt-16 pb-10">
      <EmptyState
        icon={CompassIcon}
        title={t.errors.notFoundTitle}
        description={t.errors.notFoundDescription}
        action={
          <Link href="/" className={buttonVariants({ variant: "default" })}>
            {t.errors.backToHome}
          </Link>
        }
      />
    </div>
  );
}
