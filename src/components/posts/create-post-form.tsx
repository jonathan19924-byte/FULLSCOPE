"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import type { Category } from "@/types/domain";
import { usePosts } from "@/lib/posts/posts-context";
import { useUser } from "@/components/auth/user-provider";
import { createClient } from "@/lib/supabase/client";
import { detectRelatedStory } from "@/lib/posts/detect-related-story";
import { classifyPostPerspective } from "@/lib/posts/classify-post-perspective";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  isNativePlatform,
  pickPhotoNative,
} from "@/lib/media/pick-photo";

const MAX_LENGTH = 280;

type RelatedStory = { slug: string; title: string; category: Category };

export function CreatePostForm({
  lockedStory,
  onPosted,
}: {
  /** When set, the story is pre-selected and shown as a static label instead
   * of running the auto-detect-and-confirm flow below — used when this form
   * is opened from a specific story's page, where the story is already
   * implied by context. */
  lockedStory?: RelatedStory;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  // Set once a standalone post's content clears the auto-detect check — the
  // form then shows a confirm step (link it, or keep standalone) instead of
  // posting immediately. Carries the already-uploaded mediaUrl along so
  // confirming doesn't re-upload the photo.
  const [pendingCandidate, setPendingCandidate] = useState<{ candidate: RelatedStory; mediaUrl?: string } | null>(
    null,
  );
  // Set when a post linked to a story comes back from classification as
  // genuinely unclear which side it leans toward — shows a confirm step
  // with the two perspective titles instead of guessing or forcing a side.
  const [pendingPerspective, setPendingPerspective] = useState<{
    relatedStory: RelatedStory;
    mediaUrl?: string;
    perspectiveATitle: string;
    perspectiveBTitle: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remaining = MAX_LENGTH - content.length;
  const trimmed = content.trim();

  function applyPhoto(file: File) {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

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

    applyPhoto(file);
  }

  async function handlePhotoButtonClick() {
    if (!isNativePlatform()) {
      fileInputRef.current?.click();
      return;
    }

    const result = await pickPhotoNative();
    if ("file" in result) {
      applyPhoto(result.file);
      return;
    }
    if (result.error === "wrong-type") toast(t.posts.photoWrongType);
    if (result.error === "too-large") toast(t.posts.photoTooLarge);
  }

  function removePhoto() {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
  }

  async function finalizePost(
    relatedStory: RelatedStory | undefined,
    mediaUrl: string | undefined,
    perspective?: "A" | "B",
  ) {
    const result = await addPost({
      content: trimmed,
      relatedStorySlug: relatedStory?.slug,
      relatedStoryTitle: relatedStory?.title,
      relatedStoryCategory: relatedStory?.category,
      mediaUrl,
      perspective,
    });

    setIsSubmitting(false);
    setPendingCandidate(null);
    setPendingPerspective(null);

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

  /** Runs once a post's story link is settled (locked from the start, or
   * just confirmed via the auto-detect suggestion below) — classifies which
   * side it leans toward before posting, so the reactions tabs on the story
   * page never have to guess after the fact. A post with no story skips
   * this entirely and posts immediately. */
  async function resolveStoryAndPost(relatedStory: RelatedStory | undefined, mediaUrl: string | undefined) {
    if (!relatedStory) {
      await finalizePost(undefined, mediaUrl);
      return;
    }

    setIsClassifying(true);
    const result = await classifyPostPerspective(trimmed, relatedStory.slug).catch(() => null);
    setIsClassifying(false);

    if (result && "uncertain" in result) {
      setPendingPerspective({
        relatedStory,
        mediaUrl,
        perspectiveATitle: result.perspectiveATitle,
        perspectiveBTitle: result.perspectiveBTitle,
      });
      setIsSubmitting(false);
      return;
    }

    await finalizePost(relatedStory, mediaUrl, result?.perspective);
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

    if (lockedStory) {
      await resolveStoryAndPost(lockedStory, mediaUrl);
      return;
    }

    // Standalone post — check whether it's clearly about a specific story
    // before posting, so the user can link it instead of it going out
    // untagged. Best-effort: any failure here just falls through to posting
    // as standalone, same as if no match were found.
    setIsDetecting(true);
    const candidate = await detectRelatedStory(trimmed).catch(() => null);
    setIsDetecting(false);

    if (candidate) {
      setPendingCandidate({ candidate, mediaUrl });
      setIsSubmitting(false);
      return;
    }

    await finalizePost(undefined, mediaUrl);
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
            onClick={handlePhotoButtonClick}
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

      {lockedStory ? (
        <p className="text-sm text-muted-foreground">
          {t.story.postingAboutPrefix}
          <span className="font-medium text-foreground">{lockedStory.title}</span>
        </p>
      ) : null}

      {pendingCandidate ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 p-4">
          <p className="text-sm text-foreground">
            {t.posts.relatedStorySuggestion(pendingCandidate.candidate.title)}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="flex-1 rounded-full"
              disabled={isClassifying}
              onClick={() => {
                setIsSubmitting(true);
                resolveStoryAndPost(pendingCandidate.candidate, pendingCandidate.mediaUrl);
              }}
            >
              {isClassifying ? t.posts.checkingSide : t.posts.linkToStory}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 rounded-full"
              disabled={isClassifying}
              onClick={() => {
                setIsSubmitting(true);
                finalizePost(undefined, pendingCandidate.mediaUrl);
              }}
            >
              {t.posts.keepStandalone}
            </Button>
          </div>
        </div>
      ) : pendingPerspective ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 p-4">
          <p className="text-sm text-foreground">{t.posts.whichSideQuestion}</p>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              onClick={() => {
                setIsSubmitting(true);
                finalizePost(pendingPerspective.relatedStory, pendingPerspective.mediaUrl, "A");
              }}
            >
              {pendingPerspective.perspectiveATitle}
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              onClick={() => {
                setIsSubmitting(true);
                finalizePost(pendingPerspective.relatedStory, pendingPerspective.mediaUrl, "B");
              }}
            >
              {pendingPerspective.perspectiveBTitle}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => {
                setIsSubmitting(true);
                finalizePost(pendingPerspective.relatedStory, pendingPerspective.mediaUrl);
              }}
            >
              {t.posts.notSureGeneral}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="submit"
          size="lg"
          disabled={!user || !trimmed || remaining < 0 || isSubmitting || isDetecting || isClassifying}
          className="h-12 w-full rounded-full"
        >
          {isUploadingPhoto
            ? t.posts.uploadingPhoto
            : isDetecting
              ? t.posts.checkingForStory
              : isClassifying
                ? t.posts.checkingSide
                : isSubmitting
                  ? t.posts.posting
                  : t.posts.post}
        </Button>
      )}
      <p className="text-center text-xs text-muted-foreground">{t.posts.visibleToEveryone}</p>
    </form>
  );
}
