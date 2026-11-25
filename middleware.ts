import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { reviewMode } from "@/lib/mode";

/** Keeps the organizer's session fresh. Without this the sign-in silently expires after about an hour. */
export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || process.env.ANGEL_DEMO === "1" || reviewMode()) return NextResponse.next();
  // Supabase may fall back to the configured Site URL if a redirect is not allowlisted.
  const { pathname, searchParams } = req.nextUrl;
  if (pathname === "/" || pathname === "/admin" || pathname === "/admin/login" || pathname === "/admin/reset") {
    if (searchParams.has("code") || (searchParams.has("token_hash") && searchParams.has("type"))) {
      const callback = req.nextUrl.clone();
      callback.pathname = "/auth/callback";
      if (pathname === "/admin/reset") callback.searchParams.set("next", "/admin/reset");
      return NextResponse.redirect(callback);
    }
    if (pathname === "/") return NextResponse.next();
  }
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  await sb.auth.getUser();
  return res;
}

export const config = { matcher: ["/", "/admin/:path*", "/api/admin/:path*", "/api/photo/:path*"] };
