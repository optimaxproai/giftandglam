import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { demoMode } from "./demo";
import { isAdminUser, parseAdminEmails } from "./adminAccess";

export function authClient() {
  const store = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a Server Component: the callback route refreshes cookies */
        }
      },
    },
  });
}

export const adminEmails = () => parseAdminEmails(process.env.ANGEL_ADMIN_EMAILS);

/** The signed-in organizer, or null. Only emails listed in ANGEL_ADMIN_EMAILS count. */
export async function adminUser(): Promise<{ email: string } | null> {
  if (demoMode()) return { email: "demo@example.com" };
  const { data } = await authClient().auth.getUser();
  return isAdminUser(data.user, adminEmails()) ? { email: data.user!.email!.toLowerCase() } : null;
}

export async function requireAdmin() {
  const u = await adminUser();
  if (!u) redirect("/admin/login");
  return u;
}
