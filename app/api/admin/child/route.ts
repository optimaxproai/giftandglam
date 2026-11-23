import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { adminUser } from "@/lib/auth";
import { demoMode } from "@/lib/demo";
import { firstName, normEmail, normPhone } from "@/lib/families";
import { removeChildPhoto, saveChildPhoto } from "@/lib/photos";

export const dynamic = "force-dynamic";

const str = z.string().trim().max(300).nullable();
const list = z.array(z.string().trim().min(1).max(200)).max(40);
const Patch = z
  .object({
    first_name: z.string().trim().min(1).max(80),
    full_name: z.string().trim().min(1).max(160),
    age: z.number().int().min(0).max(21).nullable(),
    gender: z.enum(["Girl", "Boy", "Other"]).nullable(),
    tops: str,
    bottoms: str,
    shoes: str,
    wants: list,
    needs: list,
    faves: list.refine((a) => a.length <= 3, "At most 3 favorites"),
    fav_color: str,
    gift_store: str,
    gift_amount: z.number().int().min(5).max(200).nullable(),
    photo_public: z.boolean(),
    approved: z.boolean(),
    organizer_notes: z.string().trim().max(2000).nullable(),
  })
  .partial();
const FamilyPatch = z
  .object({
    parent_name: z.string().trim().min(1).max(160),
    phone: str,
    email: str,
    story: z.string().trim().max(1000).nullable(),
  })
  .partial();

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update"), id: z.string().uuid(), patch: Patch.optional(), family: FamilyPatch.optional() }),
  z.object({ action: z.literal("status"), id: z.string().uuid(), status: z.enum(["available", "claimed", "purchased", "returned", "given"]) }),
  z.object({ action: z.literal("gift"), id: z.string().uuid(), value: z.enum(["none", "pledged", "received"]) }),
  z.object({ action: z.literal("photo"), id: z.string().uuid(), dataUrl: z.string().nullable() }),
]);

export async function POST(req: Request) {
  if (!(await adminUser())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (demoMode()) return NextResponse.json({ error: "Demo mode is read-only." }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Bad request" }, { status: 400 });
  const b = parsed.data;

  try {
    if (b.action === "update") {
      if (b.patch && Object.keys(b.patch).length) {
        const patch: Record<string, unknown> = { ...b.patch };
        if (b.patch.full_name && !b.patch.first_name) patch.first_name = firstName(b.patch.full_name);
        const { error } = await db().from("children").update(patch).eq("id", b.id);
        if (error) throw new Error(error.message);
      }
      if (b.family && Object.keys(b.family).length) {
        const { data: c } = await db().from("children").select("family_id").eq("id", b.id).single();
        const fam: Record<string, unknown> = { ...b.family };
        if ("phone" in b.family) fam.phone_norm = normPhone(b.family.phone);
        if ("email" in b.family) fam.email_norm = normEmail(b.family.email);
        const { error } = await db().from("families").update(fam).eq("id", c?.family_id);
        if (error) throw new Error(error.message);
      }
    } else if (b.action === "status") {
      const patch: Record<string, unknown> = { status: b.status };
      if (b.status === "available") Object.assign(patch, { sponsor_id: null, claimed_at: null, returned_at: null });
      if (b.status === "returned") patch.returned_at = new Date().toISOString();
      const { error } = await db().from("children").update(patch).eq("id", b.id);
      if (error) throw new Error(error.message);
      if (b.status === "available") await db().from("children").update({ gift_card_status: "none" }).eq("id", b.id).eq("gift_card_status", "pledged");
    } else if (b.action === "gift") {
      const { error } = await db().from("children").update({ gift_card_status: b.value }).eq("id", b.id);
      if (error) throw new Error(error.message);
    } else if (b.action === "photo") {
      if (b.dataUrl) {
        const path = await saveChildPhoto(b.id, b.dataUrl);
        await db().from("children").update({ photo_path: path }).eq("id", b.id);
      } else {
        const { data: c } = await db().from("children").select("photo_path").eq("id", b.id).single();
        if (c?.photo_path) await removeChildPhoto(c.photo_path);
        await db().from("children").update({ photo_path: null, photo_public: false }).eq("id", b.id);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Save failed" }, { status: 500 });
  }
}
