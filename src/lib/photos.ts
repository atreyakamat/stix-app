import * as ImagePicker from "expo-image-picker";

// Photos for personalised products and custom designs. Same limits as the
// shop's /api/upload: JPG, PNG or WebP, up to 8 MB.

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export type PickedPhoto = { uri: string; mimeType: string; fileName: string; width: number; height: number };

/** Opens the camera or gallery. Null when the customer backs out; throws a friendly message on a bad file. */
export async function pickPhoto(from: "camera" | "library"): Promise<PickedPhoto | null> {
  if (from === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error("Allow camera access in Settings to take a photo.");
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.85, exif: false };
  const r = from === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (r.canceled || !r.assets[0]) return null;
  const a = r.assets[0];
  // The picker re-encodes to JPEG at this quality; a PNG keeps its type.
  const mimeType = a.mimeType && TYPES.includes(a.mimeType) ? a.mimeType : "image/jpeg";
  if (a.fileSize && a.fileSize > MAX_UPLOAD_BYTES) throw new Error("That photo is over 8 MB. Pick a smaller one.");
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return { uri: a.uri, mimeType, fileName: a.fileName ?? `photo.${ext}`, width: a.width, height: a.height };
}
