import { cookies } from "next/headers";

const SPONSOR_COOKIE = "angel_sponsor";

export function sponsorSession(): string | null {
  return cookies().get(SPONSOR_COOKIE)?.value ?? null;
}

export function rememberSponsor(token: string) {
  cookies().set(SPONSOR_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
}
