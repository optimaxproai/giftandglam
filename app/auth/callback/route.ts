import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { authClient } from "@/lib/auth";

/** Finishes email links: magic sign-in and password reset. Handles both link styles Supabase can send. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/admin";
  const safe = next.startsWith("/admin") ? next : "/admin";
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const sb = authClient();
  let ok = false;
  if (code) ok = !(await sb.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await sb.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  return NextResponse.redirect(new URL(ok ? safe : "/admin/login?error=link", url.origin));
}
