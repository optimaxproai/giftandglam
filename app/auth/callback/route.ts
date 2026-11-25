import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { authClient } from "@/lib/auth";

const EMAIL_TYPES = new Set<string>(["email", "magiclink", "recovery", "invite", "signup", "email_change"]);

/** A recovery link always lands on the new-password form after verification. */
export async function GET(req: Request) {
  const { origin, searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const flowId = searchParams.get("sb_flow_id");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const legacyReset = searchParams.get("next") === "/admin/reset";
  const redirect = (path: string) => NextResponse.redirect(new URL(path, origin));
  const failure = (recovery: boolean) => redirect(`/admin/login?error=${recovery ? "reset" : "link"}`);

  if (code) {
    const sb = authClient();
    const { data, error } = await sb.auth.exchangeCodeForSession(code, flowId === null ? undefined : { flowId });
    // The SDK returns this verifier metadata at runtime, although its public type omits it.
    const recovery = legacyReset || type === "recovery" || ("redirectType" in data && data.redirectType === "recovery");
    return error ? failure(recovery) : redirect(recovery ? "/admin/reset" : "/admin");
  }

  const recovery = type === "recovery";
  if (!tokenHash || !type || !EMAIL_TYPES.has(type)) return failure(legacyReset || recovery);
  const { error } = await authClient().auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
  return error ? failure(recovery) : redirect(recovery ? "/admin/reset" : "/admin");
}
