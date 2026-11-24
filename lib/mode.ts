/**
 * Review build: a shareable preview with fictional data and no database.
 * Never on in production. Automatic on a Vercel preview that has no Supabase configured,
 * or forced with ANGEL_REVIEW=1 (local or preview only).
 */
export function reviewMode(): boolean {
  if (process.env.VERCEL_ENV === "production") return false;
  if (process.env.ANGEL_REVIEW === "1") return true;
  return process.env.VERCEL_ENV === "preview" && !process.env.NEXT_PUBLIC_SUPABASE_URL;
}
