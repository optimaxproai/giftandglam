import { db } from "./supabase/admin";

const MAX_BYTES = 1_500_000;

/** Stores a JPEG data URL as child-photos/{childId}.jpg (replacing any earlier one). Returns the object path. */
export async function saveChildPhoto(childId: string, dataUrl: string): Promise<string> {
  const m = dataUrl.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new Error("Photo must be a JPEG");
  const bytes = Buffer.from(m[1], "base64");
  if (bytes.length > MAX_BYTES) throw new Error("Photo is too large");
  const path = `${childId}.jpg`;
  const { error } = await db().storage.from("child-photos").upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  return path;
}

export async function removeChildPhoto(path: string) {
  await db().storage.from("child-photos").remove([path]);
}
