import { cookies } from "next/headers";
import { z } from "zod";
import { createSeededReviewCampaign, getCampaign } from "./campaign";
import { reviewMode } from "./mode";
import { sponsorSession } from "./sponsor-session";

const cookieName = "angel_review_claims";
const maxAge = 60 * 60 * 24;
const uuid = z.string().uuid();
const stateSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  claims: z.array(z.object({ id: uuid, gift: z.boolean(), done: z.boolean() })).max(12),
  purchased: z.array(uuid).max(50),
});

export function browserReviewAdoptions() {
  return process.env.VERCEL_ENV === "preview" && reviewMode();
}

function readState() {
  const jar = cookies();
  try {
    const data = stateSchema.parse(JSON.parse(jar.get(cookieName)?.value ?? ""));
    return data.token === sponsorSession() ? data : null;
  } catch {
    return null;
  }
}

/** Hosted previews use only fictional records. Each request reconstructs this browser's
 * checklist from an HTTP-only cookie. No contact details or production data are stored here. */
export async function getSponsorStore() {
  if (!browserReviewAdoptions()) return (await getCampaign()).store;
  const { store, ready } = createSeededReviewCampaign();
  await ready;
  const saved = readState();
  if (!saved) return store;

  const email = `preview-${saved.token}@example.invalid`;
  const sponsor = { id: saved.token, token: saved.token, name: "Anonymous sponsor", email, email_norm: email, phone: null };
  for (const claim of saved.claims) {
    const child = store.state.children.find((row) => row.id === claim.id && row.approved);
    if (!child) continue;
    store.state.sponsors.set(sponsor.id, sponsor);
    child.sponsor_id = sponsor.id;
    child.status = claim.done ? "purchased" : "claimed";
    if (claim.gift && child.gift_store) child.gift_card_status = "pledged";
  }
  for (const gift of store.state.giftItems) {
    if (saved.purchased.includes(gift.id) && store.state.children.some((row) => row.id === gift.child_id && row.sponsor_id === sponsor.id)) {
      gift.purchase_source = "sponsor";
    }
  }
  return store;
}

export async function saveReviewChecklist(store: Awaited<ReturnType<typeof getSponsorStore>>, token: string) {
  if (!browserReviewAdoptions()) return;
  const sponsor = await store.sponsorByToken(token);
  if (!sponsor) return;
  const rows = (await store.list()).filter((row) => row.sponsor_id === sponsor.id);
  const gifts = await store.listGiftItems(rows.map((row) => row.id));
  const state = {
    token,
    claims: rows.slice(0, 12).map((row) => ({
      id: row.id,
      gift: row.gift_card_status === "pledged",
      done: row.status === "purchased",
    })),
    purchased: gifts.filter((gift) => gift.purchase_source === "sponsor").slice(0, 50).map((gift) => gift.id),
  };
  cookies().set(cookieName, JSON.stringify(state), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge });
}
