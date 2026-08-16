import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type PickPhotoResult =
  | { file: File }
  | { error: "wrong-type" | "too-large" }
  | { error: "cancelled" };

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Opens Apple's native "Take Photo / Choose from Library" sheet and returns
 * the result as a File, run through the same validation as the web file
 * input — so callers can treat this and handlePhotoPick's e.target.files[0]
 * identically. Returns { error: "cancelled" } if the user backs out, which
 * callers should silently ignore (not worth a toast).
 */
export async function pickPhotoNative(): Promise<PickPhotoResult> {
  let photo;
  try {
    photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
      quality: 85,
    });
  } catch {
    // User dismissed the native picker/permission sheet.
    return { error: "cancelled" };
  }

  if (!photo.webPath) return { error: "cancelled" };

  const response = await fetch(photo.webPath);
  const blob = await response.blob();
  const mimeType = blob.type || `image/${photo.format}`;

  if (!ALLOWED_PHOTO_TYPES.includes(mimeType)) {
    return { error: "wrong-type" };
  }
  if (blob.size > MAX_PHOTO_BYTES) {
    return { error: "too-large" };
  }

  const ext = photo.format || "jpg";
  const file = new File([blob], `photo.${ext}`, { type: mimeType });
  return { file };
}
