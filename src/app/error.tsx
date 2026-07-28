"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 pt-16 pb-10">
      <EmptyState
        icon={TriangleAlert}
        title={t.errors.somethingWrong}
        description={t.errors.couldntLoad}
        action={
          <Button onClick={() => reset()} className="rounded-full">
            {t.errors.tryAgain}
          </Button>
        }
      />
    </div>
  );
}
