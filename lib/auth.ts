import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { demoMode } from "./demo";

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

export function adminEmails(): string[] {
  return (process.env.ANGEL_ADMIN_EMAILS || "")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The signed-in organizer, or null. Only emails listed in ANGEL_ADMIN_EMAILS count. */
export async function adminUser(): Promise<{ email: string } | null> {
  if (demoMode()) return { email: "demo@example.com" };
  const { data } = await authClient().auth.getUser();
  const email = data.user?.email?.toLowerCase();
  return email && adminEmails().includes(email) ? { email } : null;
}

export async function requireAdmin() {
  const u = await adminUser();
  if (!u) redirect("/admin/login");
  return u;
}
