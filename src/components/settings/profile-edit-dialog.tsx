"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { User, Camera, X } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/auth/user-provider";
import { initials } from "@/lib/format";
import { t } from "@/lib/i18n";

const MAX_BIO_LENGTH = 160;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ProfileEditDialog({
  myProfile,
  children,
}: {
  myProfile: {
    username: string | null;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
  } | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(myProfile?.username ?? "");
  const [displayName, setDisplayName] = useState(myProfile?.displayName ?? "");
  const [bio, setBio] = useState(myProfile?.bio ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Three-way avatar state: unchanged (use myProfile.avatarUrl as-is),
  // a freshly-picked file pending upload (avatarFile + a local preview
  // URL), or explicitly removed (avatarRemoved) — mirrors create-post-
  // form.tsx's photo-picker pattern.
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayedAvatarUrl = avatarRemoved ? null : (avatarPreviewUrl ?? myProfile?.avatarUrl ?? null);

  function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      toast(t.posts.photoWrongType);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast(t.posts.photoTooLarge);
      return;
    }

    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
    setAvatarRemoved(false);
  }

  function removePhoto() {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarFile(null);
    setAvatarPreviewUrl(null);
    setAvatarRemoved(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    let avatarUrl: string | null | undefined;
    if (avatarFile) {
      setIsUploadingPhoto(true);
      const supabase = createClient();
      const ext = avatarFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
      setIsUploadingPhoto(false);

      if (uploadError) {
        setIsSubmitting(false);
        toast(t.posts.photoUploadFailed);
        return;
      }

      // Cache-bust — the path is fixed per user (upsert overwrites in
      // place), so without this a re-upload would keep the old cached
      // image at the same URL until the browser's cache expires.
      avatarUrl = `${supabase.storage.from("profile-photos").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
    } else if (avatarRemoved) {
      avatarUrl = null;
    }

    const result = await updateProfileAction({ username, displayName, bio, avatarUrl });

    setIsSubmitting(false);

    if ("error" in result) {
      toast(t.profile.couldntSaveProfile, { description: result.error });
      return;
    }

    if (result.avatarRejected) {
      toast(t.profile.avatarRejectedToast, { description: t.profile.avatarRejectedDescription });
    } else {
      toast(t.profile.profileSaved);
    }
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
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              {displayedAvatarUrl ? (
                <div className="relative size-20 overflow-hidden rounded-full bg-muted">
                  <Image src={displayedAvatarUrl} alt="" fill sizes="80px" className="object-cover" />
                </div>
              ) : (
                <div className="flex size-20 items-center justify-center rounded-full bg-muted">
                  <span className="text-xl font-medium text-muted-foreground">
                    {initials(displayName || username || "?")}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label={t.profile.changeAvatarAria}
                className="absolute end-0 bottom-0 flex size-7 items-center justify-center rounded-full border-2 border-popover bg-foreground text-background transition-colors hover:bg-foreground/90"
              >
                <Camera className="size-3.5" strokeWidth={2} />
              </button>
              {displayedAvatarUrl && (
                <button
                  type="button"
                  onClick={removePhoto}
                  aria-label={t.profile.removeAvatarAria}
                  className="absolute start-0 bottom-0 flex size-6 items-center justify-center rounded-full border-2 border-popover bg-destructive text-white transition-colors hover:bg-destructive/90"
                >
                  <X className="size-3" strokeWidth={2.5} />
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoPick}
              className="hidden"
            />
          </div>

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
              {isUploadingPhoto ? t.posts.uploadingPhoto : isSubmitting ? t.profile.saving : t.profile.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
