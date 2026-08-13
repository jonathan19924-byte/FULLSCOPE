"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import type { StorySummary } from "@/types/domain";
import { usePosts } from "@/lib/posts/posts-context";
import { useUser } from "@/components/auth/user-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

const MAX_LENGTH = 280;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function CreatePostForm({
  stories,
  lockedStorySlug,
  onPosted,
}: {
  stories: Pick<StorySummary, "slug" | "title" | "category">[];
  /** When set, the story is pre-selected and the "tag a related story"
   * picker is replaced with a static label — used when this form is opened
   * from a specific story's page, where the story is already implied by
   * context rather than something the user should have to re-pick. */
  lockedStorySlug?: string;
  /** Called after a successful post instead of the default redirect to
   * /posts — used when this form is embedded in a dialog (e.g. on a story
   * page) so posting closes the dialog and stays on the current page. */
  onPosted?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { addPost } = usePosts();
  const [content, setContent] = useState("");
  const [relatedSlug, setRelatedSlug] = useState(lockedStorySlug ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_LENGTH - content.length;
  const trimmed = content.trim();

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

    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

  function removePhoto() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed || !user) return;

    setIsSubmitting(true);

    let mediaUrl: string | undefined;
    if (photoFile) {
      setIsUploadingPhoto(true);
      const supabase = createClient();
      const ext = photoFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("post-photos")
        .upload(path, photoFile, { contentType: photoFile.type });
      setIsUploadingPhoto(false);

      if (uploadError) {
        setIsSubmitting(false);
        toast(t.posts.photoUploadFailed);
        return;
      }

      mediaUrl = supabase.storage.from("post-photos").getPublicUrl(path).data.publicUrl;
    }

    const relatedStory = stories.find((s) => s.slug === relatedSlug);
    const result = await addPost({
      content: trimmed,
      relatedStorySlug: relatedStory?.slug,
      relatedStoryTitle: relatedStory?.title,
      relatedStoryCategory: relatedStory?.category,
      mediaUrl,
    });

    setIsSubmitting(false);

    if ("error" in result) {
      toast(t.posts.couldntPost, { description: result.error });
      return;
    }

    if (result.mediaRejected) {
      toast(t.posts.photoRejectedToast, { description: t.posts.photoRejectedDescription });
    } else {
      toast(t.posts.posted, { description: t.posts.postedDescription });
    }

    if (onPosted) {
      setContent("");
      removePhoto();
      onPosted();
    } else {
      router.push("/posts");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!user ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-3.5 py-2.5 text-sm">
          <span className="text-muted-foreground">{t.posts.signInToPost}</span>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/sign-in?next=${encodeURIComponent(pathname)}`}
              className="font-medium text-foreground underline underline-offset-2"
            >
              {t.common.signIn}
            </Link>
            <Link
              href={`/sign-up?next=${encodeURIComponent(pathname)}`}
              className="font-medium text-foreground underline underline-offset-2"
            >
              {t.common.signUp}
            </Link>
          </div>
        </div>
      ) : null}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">{t.posts.whatsOnYourMind}</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
          placeholder={t.posts.shareReactionPlaceholder}
          rows={5}
          autoFocus={!!user}
          disabled={!user}
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-foreground/40 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span
          className={`self-end text-xs ${remaining < 0 ? "text-destructive" : "text-muted-foreground"}`}
        >
          {remaining}
        </span>
      </label>

      <div className="flex flex-col gap-2">
        {photoPreviewUrl ? (
          <div className="relative w-fit">
            <Image
              src={photoPreviewUrl}
              alt=""
              width={160}
              height={160}
              unoptimized
              className="size-40 rounded-2xl border border-border object-cover"
            />
            <button
              type="button"
              onClick={removePhoto}
              aria-label={t.posts.removePhotoAria}
              className="absolute end-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm"
            >
              <X className="size-3.5" strokeWidth={2} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!user}
            className="flex w-fit items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:text-muted-foreground"
          >
            <ImagePlus className="size-4" strokeWidth={1.75} />
            {t.posts.addPhoto}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePhotoPick}
          className="hidden"
        />
      </div>

      {lockedStorySlug ? (
        <p className="text-sm text-muted-foreground">
          {t.story.postingAboutPrefix}
          <span className="font-medium text-foreground">
            {stories.find((s) => s.slug === lockedStorySlug)?.title}
          </span>
        </p>
      ) : (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">{t.posts.tagRelatedStory}</span>
          <select
            value={relatedSlug}
            onChange={(e) => setRelatedSlug(e.target.value)}
            disabled={!user}
            className="h-12 w-full rounded-xl border border-border bg-background px-3.5 text-[16px] text-foreground outline-none focus-visible:border-foreground/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">{t.posts.noneStandalone}</option>
            {stories.map((story) => (
              <option key={story.slug} value={story.slug}>
                {story.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!user || !trimmed || remaining < 0 || isSubmitting}
        className="h-12 w-full rounded-full"
      >
        {isUploadingPhoto ? t.posts.uploadingPhoto : isSubmitting ? t.posts.posting : t.posts.post}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t.posts.visibleToEveryone}</p>
    </form>
  );
}
