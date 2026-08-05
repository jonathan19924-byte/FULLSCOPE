"use client";

import { Clock, XCircle } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import { t } from "@/lib/i18n";

export function PendingApprovalScreen({ status }: { status: "pending" | "rejected" }) {
  const rejected = status === "rejected";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      {rejected ? (
        <XCircle className="size-10 text-muted-foreground" strokeWidth={1.5} />
      ) : (
        <Clock className="size-10 text-muted-foreground" strokeWidth={1.5} />
      )}
      <h1 className="font-serif text-xl font-semibold text-foreground">
        {rejected ? t.approval.rejectedTitle : t.approval.pendingTitle}
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {rejected ? t.approval.rejectedBody : t.approval.pendingBody}
      </p>
      <button
        type="button"
        onClick={() => signOutAction()}
        className="mt-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground/40"
      >
        {t.common.signOut}
      </button>
    </div>
  );
}
