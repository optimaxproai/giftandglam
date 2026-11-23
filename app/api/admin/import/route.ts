import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUser } from "@/lib/auth";
import { getCampaign } from "@/lib/campaign";
import { CampaignError } from "@/lib/campaign/store";
import { demoMode } from "@/lib/demo";
import { saveChildPhoto } from "@/lib/photos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const list = z.array(z.string().trim().min(1).max(200)).max(40);
const Child = z.object({
  fullName: z.string().trim().min(1).max(160),
  age: z.number().int().min(0).max(120).nullable(),
  gender: z.enum(["Girl", "Boy", "Other"]).nullable(),
  tops: z.string().trim().max(60), bottoms: z.string().trim().max(60), shoes: z.string().trim().max(60),
  wants: list, needs: list,
  faves: list.refine((a) => a.length <= 3),
  favColor: z.string().trim().max(60),
  giftStore: z.string().trim().max(80),
  giftAmount: z.number().int().min(5).max(200),
  photo: z.string().max(2_200_000).nullable(),
});
const Body = z.object({
  family: z.object({ parentName: z.string().trim().min(1).max(160), phone: z.string().trim().max(40), email: z.string().trim().max(200), story: z.string().trim().max(1000), source: z.string().trim().max(200) }),
  children: z.array(Child).min(1).max(12),
});

/**
 * Saves one reviewed family read from an email. Children arrive as "Needs review": the season's maximum-age rule
 * is applied on the way in, and approving and publishing happen afterwards in Households.
 */
export async function POST(req: Request) {
  const admin = await adminUser();
  if (!admin) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Please check the fields." }, { status: 400 });
  const { family, children } = parsed.data;
  try {
    const campaign = await getCampaign();
    const r = await campaign.enterHousehold(
      { parentName: family.parentName, phone: family.phone, email: family.email, story: family.story, source: family.source, kids: children.map((c) => ({ fullName: c.fullName, age: c.age, gender: c.gender, tops: c.tops, bottoms: c.bottoms, shoes: c.shoes, wants: c.wants, needs: c.needs, faves: c.faves, favColor: c.favColor, giftStore: c.giftStore, giftAmount: c.giftAmount })) },
      admin.email,
    );
    if (!demoMode()) {
      const byName = new Map(children.map((c) => [c.fullName, c]));
      for (const made of r.children) {
        const photo = byName.get(made.name)?.photo;
        if (photo) await campaign.store.patchChild(made.id, { photo_path: await saveChildPhoto(made.id, photo) });
      }
    }
    return NextResponse.json({ ok: true, familyId: r.familyId, merged: r.merged, created: r.children, skipped: r.skipped });
  } catch (e) {
    if (e instanceof CampaignError) return NextResponse.json({ error: e.message }, { status: 422 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Save failed" }, { status: 500 });
  }
}
