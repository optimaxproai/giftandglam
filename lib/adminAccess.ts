/** Pure admin rules, shared by the middleware and the server helpers so the two checks can never disagree. */

export function parseAdminEmails(value: string | undefined | null): string[] {
  return (value || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

type MaybeUser = { email?: string | null; email_confirmed_at?: string | null } | null | undefined;

/** An organizer is a signed-in user whose email is on the allow-list AND has been confirmed by clicking an emailed link or entering an emailed code. */
export function isAdminUser(user: MaybeUser, allow: string[]): boolean {
  const email = user?.email?.trim().toLowerCase();
  return !!email && !!user?.email_confirmed_at && allow.includes(email);
}

/** State-changing browser requests must come from this site. A request with no Origin (not a browser) is left to the other checks. */
export function sameOrigin(originHeader: string | null, host: string): boolean {
  if (!originHeader) return true;
  try {
    return new URL(originHeader).host === host;
  } catch {
    return false;
  }
}

export const isWriteMethod = (method: string) => !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
