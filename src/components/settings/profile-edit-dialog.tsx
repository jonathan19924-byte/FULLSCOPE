"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateProfileAction } from "@/lib/profile/actions";
import { t } from "@/lib/i18n";

const MAX_BIO_LENGTH = 160;

export function ProfileEditDialog({
  myProfile,
  children,
}: {
  myProfile: { username: string | null; displayName: string | null; bio: string | null } | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(myProfile?.username ?? "");
  const [displayName, setDisplayName] = useState(myProfile?.displayName ?? "");
  const [bio, setBio] = useState(myProfile?.bio ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await updateProfileAction({ username, displayName, bio });

    setIsSubmitting(false);

    if ("error" in result) {
      toast(t.profile.couldntSaveProfile, { description: result.error });
      return;
    }

    toast(t.profile.profileSaved);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<div />}>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="size-4.5" strokeWidth={1.75} />
            {t.settings.profileInfo}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">{t.profile.usernameLabel}</span>
            <div dir="ltr" className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">@</span>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                placeholder={t.profile.usernamePlaceholder}
                maxLength={20}
                required
              />
            </div>
            <span className="text-xs text-muted-foreground">{t.profile.usernameHint}</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">{t.profile.displayNameLabel}</span>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t.profile.displayNamePlaceholder}
              maxLength={50}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">{t.profile.bioLabel}</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
              placeholder={t.profile.bioPlaceholder}
              rows={3}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-2.5 py-2 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <span className="self-end text-xs text-muted-foreground">
              {MAX_BIO_LENGTH - bio.length}
            </span>
          </label>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>{t.common.close}</DialogClose>
            <Button type="submit" disabled={isSubmitting || username.length < 3}>
              {isSubmitting ? t.profile.saving : t.profile.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
