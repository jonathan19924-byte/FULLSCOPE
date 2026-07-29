"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackButton({ ariaLabel, className }: { ariaLabel: string; className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label={ariaLabel}
      className={cn(
        "flex size-9 items-center justify-center rounded-full transition-colors hover:bg-muted",
        className,
      )}
    >
      <ArrowLeft className="size-5 rtl:rotate-180" strokeWidth={1.75} />
    </button>
  );
}
