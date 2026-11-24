import type { ChildRow } from "./types";
import { readGiftCards } from "./giftCards";

export type GiftKind = "need" | "want" | "gift_card";
export type GiftSource = "sponsor" | "organizer" | "donation";
export type GiftItem = { id: string; child_id: string; item_key: string; kind: GiftKind; label: string; amount: number | null; position: number; active: boolean; purchase_source: GiftSource | null; received: boolean; donation_assigned: boolean };
export const GIFT_KIND: Record<GiftKind, string> = { need: "Need", want: "Want", gift_card: "Gift card" };
export const giftLabel = (g: Pick<GiftItem, "label" | "amount">) => g.amount == null ? g.label : `${g.label} — $${g.amount}`;
export const giftCounts = (items: GiftItem[]) => { const active = items.filter(g => g.active); return { total: active.length, purchased: active.filter(g => g.purchase_source !== null).length, received: active.filter(g => g.received).length, covered: active.filter(g => g.donation_assigned).length }; };

/** Stable within a child; repeated identical list entries are separate requests. Reordering preserves progress. */
export function requestItems(c: ChildRow): Omit<GiftItem, "id" | "purchase_source" | "received" | "donation_assigned">[] {
  const base: { kind: GiftKind; label: string; amount: number | null }[] = [...c.needs.map(label => ({kind: "need" as const, label, amount: null})), ...c.wants.map(label => ({kind: "want" as const, label, amount: null})), ...readGiftCards(c).map(g => ({kind: "gift_card" as const, label: g.store, amount: g.amount}))];
  const occurrences = new Map<string, number>();
  return base.map((item, position) => {
    const label = item.label.trim(); const key = JSON.stringify([item.kind, label, item.amount]); const n = (occurrences.get(key) ?? 0) + 1; occurrences.set(key, n);
    return { ...item, label, child_id: c.id, item_key: JSON.stringify([item.kind, label, item.amount, n]), position, active: true };
  }).filter(g => !!g.label);
}

export type AdminGiftEdit = { itemId: string; action: "purchase"; source: GiftSource | null } | { itemId: string; action: "received" | "donation"; value: boolean };

export function maySponsorEdit(item: GiftItem, child: ChildRow, sponsorId: string) {
  return item.active && item.child_id === child.id && child.sponsor_id === sponsorId && ["claimed", "purchased"].includes(child.status) && !item.received && !item.donation_assigned && (!item.purchase_source || item.purchase_source === "sponsor");
}
