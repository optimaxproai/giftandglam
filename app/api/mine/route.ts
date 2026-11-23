import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { demoMode } from "@/lib/demo";
import { allow, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const Body = z.object({ token: z.string().regex(/^[a-z0-9]{8,80}$/), childId: z.string().uuid(), action: z.enum(["bought", "release"]) });

/** A sponsor can only touch their own angels, and only forward ("bought") or back to the tree ("release"). */
export async function POST(req: Request) {
  if (demoMode()) return NextResponse.json({ error: "Demo mode is read-only." }, { status: 403 });
  if (!allow(`mine:${clientIp(req)}`, 30, 10 * 60_000)) return NextResponse.json({ error: "Too many tries." }, { status: 429 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { token, childId, action } = parsed.data;

  const { data: sponsor } = await db().from("sponsors").select("id").eq("token", token).maybeSingle();
  if (!sponsor) return NextResponse.json({ error: "We couldn't find your list." }, { status: 404 });

  if (action === "bought") {
    const { data } = await db().from("children").update({ status: "purchased" }).eq("id", childId).eq("sponsor_id", sponsor.id).eq("status", "claimed").select("id");
    if (!data?.length) return NextResponse.json({ error: "This angel can't be updated." }, { status: 409 });
  } else {
    const { data } = await db()
      .from("children")
      .update({ status: "available", sponsor_id: null, claimed_at: null })
      .eq("id", childId)
      .eq("sponsor_id", sponsor.id)
      .in("status", ["claimed", "purchased"])
      .select("id,gift_card_status");
    if (!data?.length) return NextResponse.json({ error: "This angel can't be released." }, { status: 409 });
    if (data[0].gift_card_status === "pledged") await db().from("children").update({ gift_card_status: "none" }).eq("id", childId);
  }
  return NextResponse.json({ ok: true });
}
