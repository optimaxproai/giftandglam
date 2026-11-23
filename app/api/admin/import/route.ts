import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { adminUser } from "@/lib/auth";
import { demoMode } from "@/lib/demo";
import { firstName, normEmail, normPhone, sameChild } from "@/lib/families";
import { saveChildPhoto } from "@/lib/photos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const list = z.array(z.string().trim().min(1).max(200)).max(40);
const Child = z.object({
  fullName: z.string().trim().min(1).max(160),
  age: z.number().int().min(0).max(21).nullable(),
  gender: z.enum(["Girl", "Boy", "Other"]).nullable(),
  tops: z.string().trim().max(60),
  bottoms: z.string().trim().max(60),
  shoes: z.string().trim().max(60),
  wants: list,
  needs: list,
  faves: list.refine((a) => a.length <= 3),
  favColor: z.string().trim().max(60),
  giftStore: z.string().trim().max(80),
  giftAmount: z.number().int().min(5).max(200),
  photo: z.string().max(2_200_000).nullable(),
});
const Body = z.object({
  family: z.object({
    parentName: z.string().trim().min(1).max(160),
    phone: z.string().trim().max(40),
    email: z.string().trim().max(200),
    story: z.string().trim().max(1000),
    source: z.string().trim().max(200),
  }),
  photosOk: z.boolean(),
  approve: z.boolean(),
  children: z.array(Child).min(1).max(12),
});

/**
 * Saves one reviewed family. A family that already exists (same phone or email) is reused so siblings
 * from a second email join the same household. A child with the same first name and age is skipped.
 */
export async function POST(req: Request) {
  if (!(await adminUser())) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (demoMode()) return NextResponse.json({ error: "Demo mode is read-only. Nothing was saved." }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Please check the fields." }, { status: 400 });
  const { family, children, photosOk, approve } = parsed.data;

  try {
    const phone = normPhone(family.phone);
    const email = normEmail(family.email);
    let familyId: string | null = null;
    if (phone) {
      const { data } = await db().from("families").select("id").eq("phone_norm", phone).limit(1);
      familyId = data?.[0]?.id ?? null;
    }
    if (!familyId && email) {
      const { data } = await db().from("families").select("id").eq("email_norm", email).limit(1);
      familyId = data?.[0]?.id ?? null;
    }
    const merged = !!familyId;
    if (!familyId) {
      const { data, error } = await db()
        .from("families")
        .insert({ parent_name: family.parentName, phone: family.phone || null, phone_norm: phone || null, email: family.email || null, email_norm: email || null, story: family.story || null, source_label: family.source || null })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      familyId = data.id as string;
    }

    const { data: existing } = await db().from("children").select("full_name,age").eq("family_id", familyId);
    const created: { id: string; no: number; name: string }[] = [];
    const skipped: string[] = [];

    for (const c of children) {
      if ((existing || []).some((e) => sameChild(e, { full_name: c.fullName, age: c.age }))) {
        skipped.push(c.fullName);
        continue;
      }
      const { data, error } = await db()
        .from("children")
        .insert({
          family_id: familyId,
          full_name: c.fullName,
          first_name: firstName(c.fullName),
          age: c.age,
          gender: c.gender,
          tops: c.tops || null,
          bottoms: c.bottoms || null,
          shoes: c.shoes || null,
          wants: c.wants,
          needs: c.needs,
          faves: c.faves,
          fav_color: c.favColor || null,
          gift_store: c.giftStore || null,
          gift_amount: c.giftStore ? c.giftAmount : null,
          photo_public: !!(photosOk && c.photo),
          approved: approve,
        })
        .select("id,no")
        .single();
      if (error) throw new Error(error.message);
      if (c.photo) {
        const path = await saveChildPhoto(data.id as string, c.photo);
        await db().from("children").update({ photo_path: path }).eq("id", data.id);
      }
      created.push({ id: data.id as string, no: data.no as number, name: firstName(c.fullName) });
    }
    return NextResponse.json({ ok: true, familyId, merged, created, skipped });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Save failed" }, { status: 500 });
  }
}
