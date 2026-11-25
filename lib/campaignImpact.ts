import { onTree } from "./child";
import { giftCounts, type GiftItem } from "./giftItems";
import type { DonationOffer } from "./donations";
import type { ChildRow } from "./types";

/** Only aggregate, published campaign statistics cross the public boundary. */
export function campaignImpact(rows: ChildRow[], items: GiftItem[], offers: DonationOffer[]) {
  const published = rows.filter(onTree);
  const ids = new Set(published.map(c => c.id));
  const gifts = giftCounts(items.filter(g => ids.has(g.child_id)));
  // An offer is not proof of attendance. Deduplicate volunteer offers by email.
  const volunteerEmails = new Set(offers.filter(o => o.purpose === "other" && /^(Event volunteering|Gift sorting or bagging|Gift collection or delivery assistance)(\n|$)/.test(o.details)).map(o => o.email.trim().toLowerCase()).filter(Boolean));
  return {
    total: published.length,
    available: published.filter(c => c.status === "available").length,
    sponsored: published.filter(c => c.sponsor_id !== null).length,
    familiesSupported: new Set(published.filter(c => c.status === "given").map(c => c.family_id)).size,
    childrenGiven: published.filter(c => c.status === "given").length,
    purchased: gifts.purchased,
    requested: gifts.total,
    received: gifts.received,
    volunteerOffers: volunteerEmails.size,
  };
}
export type CampaignImpact = ReturnType<typeof campaignImpact>;
