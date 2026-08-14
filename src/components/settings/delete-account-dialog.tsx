"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteAccountAction } from "@/lib/account/actions";
import { t } from "@/lib/i18n";

export function DeleteAccountDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteAccountAction();
    setIsDeleting(false);

    if ("error" in result) {
      toast(t.settings.couldntDeleteAccount, { description: result.error });
      return;
    }

    setOpen(false);
    toast(t.settings.accountDeletedToast);
    // Full navigation, not router.push — clears every client-side cache of
    // the now-deleted account (same reasoning as sign-in's redirect).
    window.location.href = "/";
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<div />}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="size-4.5" strokeWidth={1.75} />
            {t.settings.deleteAccountDialogTitle}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">{t.settings.deleteAccountWarning}</p>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>{t.common.close}</DialogClose>
          <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
            {isDeleting ? t.settings.deletingAccount : t.settings.deleteAccountConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
