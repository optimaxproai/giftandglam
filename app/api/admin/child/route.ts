import { NextResponse } from "next/server";
import { z } from "zod";
import { adminUser } from "@/lib/auth";
import { getCampaign } from "@/lib/campaign";
import { CampaignError } from "@/lib/campaign/store";
import { demoMode } from "@/lib/demo";
import { firstName, normEmail, normPhone } from "@/lib/families";
import { removeChildPhoto, saveChildPhoto } from "@/lib/photos";
import { db } from "@/lib/supabase/admin";
import { GiftCardsSchema, giftCardFields, readGiftCards } from "@/lib/giftCards";

export const dynamic = "force-dynamic";

const str = z.string().trim().max(300).nullable();
const list = z.array(z.string().trim().min(1).max(200)).max(40);
// Decision, publishing, photo visibility and the age rule are NOT editable here: they have their own checked actions.
const Patch = z
  .object({
    full_name: z.string().trim().min(1).max(160),
    age: z.number().int().min(0).max(120).nullable(),
    gender: z.enum(["Girl", "Boy", "Other"]).nullable(),
    tops: str, coat_size: z.string().trim().max(60).nullable(), bottoms: str, shoes: str,
    wants: list, needs: list,
    faves: list.refine((a) => a.length <= 3, "At most 3 favorites"),
    fav_color: str, gift_store: str,
    gift_amount: z.number().int().min(5).max(200).nullable(),
    gift_cards: GiftCardsSchema,
    organizer_notes: z.string().trim().max(2000).nullable(),
  })
  .partial();
const FamilyPatch = z.object({ parent_name: z.string().trim().min(1).max(160), phone: str, email: str, story: z.string().trim().max(1000).nullable() }).partial();

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update"), id: z.string().uuid(), patch: Patch.optional(), family: FamilyPatch.optional() }),
  z.object({ action: z.literal("status"), id: z.string().uuid(), status: z.enum(["available", "claimed", "purchased", "returned", "given"]) }),
  z.object({ action: z.literal("gift"), id: z.string().uuid(), value: z.enum(["none", "pledged", "received"]) }),
  z.object({ action: z.literal("clear_all"), id: z.string().uuid() }),
  z.object({ action: z.literal("photo"), id: z.string().uuid(), dataUrl: z.string().nullable() }),
]);

export async function POST(req: Request) {
  const admin = await adminUser();
  if (!admin) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Bad request" }, { status: 400 });
  const b = parsed.data;
  const campaign = await getCampaign();
  const store = campaign.store;

  try {
    if (b.action === "update") {
      if (b.patch && Object.keys(b.patch).length) {
        const { age, gift_cards, gift_store, gift_amount, ...rest } = b.patch;
        const patch: Record<string, unknown> = { ...rest };
        if (gift_cards !== undefined || gift_store !== undefined || gift_amount !== undefined) {
          const current = (await store.list()).find((x) => x.id === b.id);
          if (!current) throw new CampaignError("Child not found.", "not_found");
          const previous = readGiftCards(current);
          const storeName = gift_store === undefined ? previous[0]?.store : gift_store;
          const amount = gift_amount === undefined ? previous[0]?.amount : gift_amount;
          const next = gift_cards ?? [...(storeName && amount ? [{ store: storeName, amount }] : []), ...previous.slice(1)];
          const changed = previous.length !== next.length || previous.some((card, i) => card.store !== next[i]?.store || card.amount !== next[i]?.amount);
          if (current.gift_card_status !== "none" && changed) {
            throw new CampaignError("A gift card pledge or receipt is recorded. Clear that status before changing the gift card list.", "conflict");
          }
          Object.assign(patch, giftCardFields(next));
        }
        if (rest.full_name) patch.first_name = firstName(rest.full_name);
        if (Object.keys(patch).length) await store.patchChild(b.id, patch);
        if (age !== undefined) await campaign.setAge(b.id, age, false, admin.email); // the age rule runs on every age change
      }
      if (b.family && Object.keys(b.family).length) {
        const c = (await store.list()).find((x) => x.id === b.id);
        if (!c) throw new CampaignError("Child not found.", "not_found");
        const fam: Record<string, unknown> = { ...b.family };
        if ("phone" in b.family) fam.phone_norm = normPhone(b.family.phone) || null;
        if ("email" in b.family) fam.email_norm = normEmail(b.family.email) || null;
        await store.patchFamily(c.family_id, fam);
      }
    } else if (b.action === "status") {
      const patch: Record<string, unknown> = { status: b.status };
      if (b.status === "available") Object.assign(patch, { sponsor_id: null, claimed_at: null, returned_at: null });
      if (b.status === "returned") patch.returned_at = new Date().toISOString();
      await store.patchChild(b.id, patch);
      if (b.status === "available") {
        const c = (await store.list()).find((x) => x.id === b.id);
        if (c?.gift_card_status === "pledged") await store.patchChild(b.id, { gift_card_status: "none" });
      }
    } else if (b.action === "clear_all") {
      // Back to a clean slate: no sponsor, Available, gift cards off. The tree setting and the decision are never touched.
      await store.patchChild(b.id, { status: "available", sponsor_id: null, claimed_at: null, returned_at: null, gift_card_status: "none" });
    } else if (b.action === "gift") {
      await store.patchChild(b.id, { gift_card_status: b.value });
    } else if (b.action === "photo") {
      if (demoMode()) return NextResponse.json({ error: "Photos aren't stored in the review build." }, { status: 403 });
      if (b.dataUrl) {
        const path = await saveChildPhoto(b.id, b.dataUrl);
        await store.patchChild(b.id, { photo_path: path });
      } else {
        const { data: c } = await db().from("children").select("photo_path").eq("id", b.id).single();
        if (c?.photo_path) await removeChildPhoto(c.photo_path);
        await store.patchChild(b.id, { photo_path: null, photo_public: false });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof CampaignError) return NextResponse.json({ error: e.message }, { status: e.code === "not_found" ? 404 : 422 });
    return NextResponse.json({ error: e instanceof Error ? e.message : "Save failed" }, { status: 500 });
  }
}
