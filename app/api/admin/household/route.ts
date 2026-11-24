import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUser } from "@/lib/auth";
import { getCampaign, resetCampaignReview } from "@/lib/campaign";
import { CampaignError } from "@/lib/campaign/store";
import { reviewMode } from "@/lib/mode";
import { GiftCardsSchema } from "@/lib/giftCards";

export const dynamic = "force-dynamic";

const lines = z.array(z.string().trim().min(1).max(200)).max(40);
const Kid = z.object({
  fullName: z.string().trim().min(1).max(160),
  age: z.number().int().min(0).max(120).nullable(),
  ageUnsure: z.boolean().optional(),
  gender: z.enum(["Girl", "Boy", "Other"]).nullable(),
  tops: z.string().max(60).optional(), bottoms: z.string().max(60).optional(), shoes: z.string().max(60).optional(),
  wants: lines, needs: lines, faves: lines.refine((a) => a.length <= 3, "At most 3 interests"),
  favColor: z.string().max(60).optional(), giftStore: z.string().max(80).optional(), giftAmount: z.number().int().min(5).max(200).optional(),
  giftCards: GiftCardsSchema.optional(),
  notes: z.string().max(1000).optional(),
});
const id = z.string().uuid();
const CustomLabelLayout = z.object({
  pageWidth: z.number(), pageHeight: z.number(),
  width: z.number(), height: z.number(),
  perPage: z.number(), columns: z.number(),
  left: z.number(), top: z.number(),
  gapX: z.number(), gapY: z.number(),
  cutGuides: z.boolean(),
});
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("enter"), parentName: z.string().max(160), phone: z.string().max(40).optional(), email: z.string().max(200).optional(), story: z.string().max(2000).optional(), source: z.string().max(200).optional(), kids: z.array(Kid).min(1).max(12) }),
  z.object({ action: z.literal("decide"), childId: id, decision: z.enum(["pending", "approved", "needs_info", "declined", "set_aside"]), reason: z.string().max(1000).optional() }),
  z.object({ action: z.literal("set_age"), childId: id, age: z.number().int().min(0).max(120).nullable(), unsure: z.boolean().optional() }),
  z.object({ action: z.literal("confirm_age"), childId: id }),
  z.object({ action: z.literal("publish"), childId: id }),
  z.object({ action: z.literal("unpublish"), childId: id }),
  z.object({ action: z.literal("publish_all"), familyId: id.optional() }),
  z.object({ action: z.literal("update_household"), familyId: id, parentName: z.string().max(160).optional(), phone: z.string().max(40).optional(), email: z.string().max(200).optional(), story: z.string().max(2000).optional() }),
  z.object({ action: z.literal("save_max_age"), maxAge: z.number().int() }),
  z.object({ action: z.literal("save_label_stock"), stock: z.union([z.string().max(40), CustomLabelLayout]).nullable() }),
  z.object({ action: z.literal("reset_review") }),
]);

/** Organizer-only: household entry, decisions, publishing and season settings for the 2026 campaign. */
export async function POST(req: Request) {
  const admin = await adminUser();
  if (!admin) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Please check the form." }, { status: 400 });
  const b = parsed.data;
  try {
    if (b.action === "reset_review") {
      if (!reviewMode()) return NextResponse.json({ error: "Only available in the review build." }, { status: 403 });
      await resetCampaignReview();
      return NextResponse.json({ ok: true });
    }
    const c = await getCampaign();
    const by = admin.email;
    let result: unknown = {};
    if (b.action === "enter") result = await c.enterHousehold({ parentName: b.parentName, phone: b.phone, email: b.email, story: b.story, source: b.source, kids: b.kids }, by);
    else if (b.action === "decide") await c.decide(b.childId, b.decision, { reason: b.reason, by });
    else if (b.action === "set_age") await c.setAge(b.childId, b.age, !!b.unsure, by);
    else if (b.action === "confirm_age") await c.confirmAge(b.childId);
    else if (b.action === "publish") await c.publish(b.childId);
    else if (b.action === "unpublish") await c.unpublish(b.childId);
    else if (b.action === "publish_all") result = { published: await c.publishAll(b.familyId) };
    else if (b.action === "update_household") await c.updateHousehold(b.familyId, b);
    else if (b.action === "save_max_age") result = await c.saveMaxAge(b.maxAge, by);
    else if (b.action === "save_label_stock") await c.saveLabelStock(b.stock);
    return NextResponse.json({ ok: true, ...(result as object) });
  } catch (e) {
    if (e instanceof CampaignError) return NextResponse.json({ error: e.message }, { status: e.code === "not_found" ? 404 : 422 });
    return NextResponse.json({ error: "Something went wrong saving that." }, { status: 500 });
  }
}
