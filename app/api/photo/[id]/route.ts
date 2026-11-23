import { NextResponse } from "next/server";
import { db } from "@/lib/supabase/admin";
import { adminUser } from "@/lib/auth";
import { demoChildren, demoMode } from "@/lib/demo";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Child photos live in a private bucket. This route is the only way out:
 * organizers always see them; everyone else only when an organizer turned "Show photo to sponsors" on.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const admin = await adminUser();

  if (demoMode()) {
    const c = demoChildren().find((x) => x.id === params.id);
    if (!c || !c.photo_path || (!admin && !c.photo_public)) return new NextResponse("Not found", { status: 404 });
    const hue = (c.no * 47) % 360;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="hsl(${hue} 45% 82%)"/><circle cx="60" cy="48" r="22" fill="hsl(${hue} 30% 38%)"/><path d="M14 120c4-34 28-44 46-44s42 10 46 44z" fill="hsl(${hue} 30% 38%)"/><text x="60" y="112" font-size="11" text-anchor="middle" fill="#fff" font-family="sans-serif">sample photo</text></svg>`;
    return new NextResponse(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "no-store" } });
  }

  if (!UUID.test(params.id)) return new NextResponse("Not found", { status: 404 });
  const { data: c } = await db().from("children").select("photo_path,photo_public,approved").eq("id", params.id).maybeSingle();
  if (!c?.photo_path || (!admin && !(c.photo_public && c.approved))) return new NextResponse("Not found", { status: 404 });

  const { data, error } = await db().storage.from("child-photos").download(c.photo_path);
  if (error || !data) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(await data.arrayBuffer(), {
    headers: { "content-type": "image/jpeg", "cache-control": admin ? "private, no-store" : "public, max-age=60" },
  });
}
