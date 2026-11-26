import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { reviewMode } from "@/lib/mode";
import { isAdminUser, isWriteMethod, parseAdminEmails, sameOrigin } from "@/lib/adminAccess";

/** Admin pages that must stay reachable without a session. */
const PUBLIC_ADMIN = new Set(["/admin/login", "/admin/reset"]);

/** Keeps the organizer's session fresh. Without this the sign-in silently expires after about an hour. */
export async function middleware(req: NextRequest) {
  // Cross-site requests may not change anything, whether or not anyone is signed in.
  if (isWriteMethod(req.method) && !sameOrigin(req.headers.get("origin"), req.nextUrl.host)) {
    return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
  }
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
  const { data } = await sb.auth.getUser();
  // Second lock on the back end. Every admin page and route also checks for itself; this stops a forgotten check from exposing anything.
  const guarded = (pathname.startsWith("/admin") && !PUBLIC_ADMIN.has(pathname)) || pathname.startsWith("/api/admin");
  if (guarded && !isAdminUser(data.user, parseAdminEmails(process.env.ANGEL_ADMIN_EMAILS))) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const login = req.nextUrl.clone();
    login.pathname = "/admin/login";
    login.search = "";
    return NextResponse.redirect(login);
  }
  return res;
}

export const config = { matcher: ["/", "/admin/:path*", "/api/:path*", "/auth/signout", "/mine/:path*"] };
