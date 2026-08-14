"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { reportContentAction, type ReportReason, type ReportTargetType } from "@/lib/safety/actions";
import { t } from "@/lib/i18n";

const REASONS: ReportReason[] = ["spam", "harassment", "inappropriate", "misinformation", "other"];

/** Controlled rather than composed with a DialogTrigger — this is opened
 * from a DropdownMenuItem (post/comment "more options" menu), and nesting a
 * Dialog trigger inside a Menu item fights both components' own open-state
 * handling. The menu item just calls onOpenChange(true) directly instead. */
export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
}) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await reportContentAction({ targetType, targetId, reason, details });

    setIsSubmitting(false);

    if ("error" in result) {
      toast(t.safety.couldntReport, { description: result.error });
      return;
    }

    toast(t.safety.reportSubmitted, { description: t.safety.reportSubmittedDescription });
    setReason("spam");
    setDetails("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.safety.reportDialogTitle}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium text-foreground">{t.safety.reportReasonLabel}</legend>
            {REASONS.map((value) => (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-xl border border-border px-3.5 py-2.5 text-sm text-foreground transition-colors",
                  reason === value && "border-foreground/60 bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={value}
                  checked={reason === value}
                  onChange={() => setReason(value)}
                  className="size-4 accent-foreground"
                />
                {t.safety.reasons[value]}
              </label>
            ))}
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">{t.safety.detailsLabel}</span>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={t.safety.detailsPlaceholder}
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{t.common.close}</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t.safety.submittingReport : t.safety.submitReport}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
